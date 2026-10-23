"""Bounded FIT extraction and JSON-only MFA persistence for the pinned Garmin client."""
import io
import json
from types import SimpleNamespace
import zipfile
from http.cookiejar import Cookie

MAX_FIT_BYTES = 10 * 1024 * 1024
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
MFA_FIELDS = ('_mfa_login_params','_mfa_post_headers','_mfa_service_url','_mfa_flow','_mfa_method')


def unpack_fit(data):
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise ValueError('This workout file is too large.')
    if zipfile.is_zipfile(io.BytesIO(data)):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if len(archive.infolist()) > 100:
                raise ValueError('Unexpected workout archive.')
            fits = [i for i in archive.infolist() if not i.is_dir() and i.filename.lower().endswith('.fit')]
            if len(fits) != 1:
                raise ValueError('This activity does not contain one supported FIT workout.')
            if fits[0].file_size > MAX_FIT_BYTES:
                raise ValueError('FIT workouts must be 10 MB or smaller.')
            with archive.open(fits[0]) as source:
                data = source.read(MAX_FIT_BYTES + 1)
    if len(data) > MAX_FIT_BYTES or len(data) < 14 or data[0] not in (12,14) or data[8:12] != b'.FIT':
        raise ValueError('Garmin did not return a supported FIT workout.')
    return data


def dump_mfa(api):
    client = api.client
    session = client._mfa_session
    cookies = []
    for cookie in session.cookies.jar:
        cookies.append({key: getattr(cookie, key) for key in (
            'version','name','value','port','port_specified','domain','domain_specified',
            'domain_initial_dot','path','path_specified','secure','expires','discard','comment','comment_url')}
            | {'rest': dict(cookie._rest), 'rfc2109': cookie.rfc2109})
    result = {'fields': {key: getattr(client,key,None) for key in MFA_FIELDS},
              'cookies': cookies, 'headers': dict(session.headers),
              'cffi': type(session).__module__.startswith('curl_cffi'),
              'impersonate': getattr(session,'impersonate',None)}
    response = getattr(client,'_widget_last_resp',None)
    if response is not None:
        result['widget_html'] = response.text
    serialized = json.dumps(result)
    if len(serialized) > 500000:
        raise ValueError('Garmin verification session is too large. Try reconnecting.')
    # Explicit fields contain cookies/CSRF context, never username/password or a pickled client.
    return result


def restore_mfa(api, state):
    if state['cffi']:
        from curl_cffi.requests import Session
        session = Session(impersonate=state.get('impersonate') or 'chrome')
    else:
        from requests import Session
        session = Session()
    session.headers.update(state['headers'])
    for raw in state['cookies']:
        session.cookies.jar.set_cookie(Cookie(**raw))
    client = api.client
    client._mfa_session = session
    client._mfa_pending = True
    for key in MFA_FIELDS:
        if state['fields'].get(key) is not None:
            setattr(client,key,state['fields'][key])
    if 'widget_html' in state:
        client._widget_last_resp = SimpleNamespace(text=state['widget_html'])
