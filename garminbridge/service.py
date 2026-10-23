import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone

import requests
from cryptography.fernet import Fernet, InvalidToken
from garminconnect import Garmin, GarminConnectAuthenticationError, GarminConnectTooManyRequestsError
from .core import dump_mfa, restore_mfa, unpack_fit

logging.disable(logging.CRITICAL)  # Never log Garmin credentials, sessions, requests or raw responses.
CONSENT_VERSION = '2026-10-10-garmin-experimental'


class ApiError(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class Bridge:
    def __init__(self):
        self.url = os.environ['SAGE_SUPABASE_URL'].rstrip('/')
        self.secret = os.environ['SAGE_SUPABASE_SERVICE_KEY']
        self.fernet = Fernet(os.environ['SAGE_GARMIN_ENCRYPTION_KEY'].encode())

    def request(self, method, path, **kwargs):
        headers = {'apikey': self.secret, 'Authorization': f'Bearer {self.secret}',
                   'Content-Type': 'application/json'}
        headers.update(kwargs.pop('headers',{}))
        result = requests.request(method, self.url+path, headers=headers, timeout=40, **kwargs)
        if not result.ok:
            # Never forward raw database details, tokens or URLs to clients.
            if result.status_code==409:
                raise ApiError(409,'This Garmin account is already connected to another Sage athlete.')
            raise ApiError(502,'Sage could not complete this Garmin request. Try again later.')
        return result.json() if result.content else None

    def authenticate(self, token):
        if not token or len(token)>16000:
            raise ApiError(401,'Sign in to Sage first.')
        result = requests.get(self.url+'/auth/v1/user', headers={
            'apikey': self.secret, 'Authorization': f'Bearer {token}'}, timeout=20)
        if not result.ok:
            raise ApiError(401,'Sign in to Sage again.')
        user_id = str(uuid.UUID(result.json()['id']))
        rows = self.request('GET','/rest/v1/users',params={'id':f'eq.{user_id}','select':'id,role,status'})
        if not rows or rows[0]['role'] != 'athlete' or rows[0]['status']=='suspended':
            raise ApiError(403,'Garmin connections are available to eligible athlete accounts.')
        return user_id

    def read(self, user_id):
        rows = self.request('GET','/rest/v1/garmin_connections',params={'user_id':f'eq.{user_id}'})
        return rows[0] if rows else {'status':'disconnected'}

    def public_status(self, row):
        state = row.get('status','disconnected')
        if state=='pending_mfa' and (not row.get('mfa_expires_at') or datetime.fromisoformat(row['mfa_expires_at'])<datetime.now(timezone.utc)):
            state='reconnect_required'
        return {'status':state,'last_synced_at':row.get('last_synced_at'),
                'error':row.get('last_error'),'experimental':True}

    def encrypt(self, user_id, kind, payload):
        return self.fernet.encrypt(json.dumps({'owner':user_id,'kind':kind,'payload':payload}).encode()).decode()

    def decrypt(self, user_id, kind, cipher):
        try:
            result=json.loads(self.fernet.decrypt(cipher.encode()))
            if result['owner']!=user_id or result['kind']!=kind:
                raise ValueError()
            return result['payload']
        except (InvalidToken,ValueError,KeyError,AttributeError):
            raise ApiError(409,'Reconnect Garmin to continue.')

    def patch(self,user_id,lease,fields):
        return self.request('PATCH','/rest/v1/garmin_connections',params={
            'user_id':f'eq.{user_id}','lease_id':f'eq.{lease}'},json={**fields,'updated_at':now_iso()},
            headers={'Prefer':'return=representation'})

    def claim(self,user_id,lease,action):
        result=requests.post(self.url+'/rest/v1/rpc/sage_claim_garmin',headers={
            'apikey':self.secret,'Authorization':f'Bearer {self.secret}'},
            json={'p_user_id':user_id,'p_lease_id':lease,'p_action':action},timeout=20)
        if not result.ok:
            if result.status_code in (409,423) or result.json().get('code')=='55P03':
                raise ApiError(409,'A request is running or was just completed. Wait 15 seconds and try again.')
            raise ApiError(403,'Sage could not start this Garmin request.')
        return result.json()

    def connected(self,user_id,lease,api,imported=None):
        # Force profile verification before accepting the account, including non-MFA early returns.
        profile=api.client.connectapi('/userprofile-service/socialProfile')
        account=str(profile.get('profileId') or profile.get('displayName') or '')
        if not account:
            raise ApiError(502,'Garmin did not identify the connected account.')
        self.patch(user_id,lease,{'status':'connected','garmin_account_id':account,
            'encrypted_session':self.encrypt(user_id,'tokens',{'tokens':json.loads(api.client.dumps()),'imported':imported or []}),
            'mfa_expires_at':None,'last_error':None})
        return {'status':'connected','message':'Garmin connected. Tap Sync recent workouts to import activities.'}

    def handle(self,token,action,body):
        user_id=self.authenticate(token)
        if action=='status':
            return self.public_status(self.read(user_id))
        if action not in ('connect','mfa','sync','disconnect'):
            raise ApiError(400,'Choose a valid Garmin action.')
        if action=='connect':
            if body.get('consent') is not True:
                raise ApiError(400,'Accept the Garmin connection notice first.')
            email,password=body.get('email'),body.get('password')
            if not isinstance(email,str) or '@' not in email or len(email)>254 or not isinstance(password,str) or not 1<=len(password)<=1024:
                raise ApiError(400,'Enter your Garmin email and password.')
        if action=='mfa' and (not isinstance(body.get('code'),str) or not 4<=len(body['code'])<=12):
            raise ApiError(400,'Enter the verification code sent by Garmin.')
        lease=str(uuid.uuid4())
        row=self.claim(user_id,lease,action)
        try:
            if action=='disconnect':
                self.patch(user_id,lease,{'status':'disconnected','encrypted_session':None,'garmin_account_id':None,
                    'mfa_expires_at':None,'last_error':None})
                return {'status':'disconnected','message':'Garmin disconnected. Imported workouts remain in Sage.'}
            if action=='connect':
                self.patch(user_id,lease,{'status':'disconnected','encrypted_session':None,'garmin_account_id':None,
                    'consent_at':now_iso(),'consent_version':CONSENT_VERSION,'mfa_expires_at':None,'last_error':None})
                api=Garmin(email=email.strip(),password=password,return_on_mfa=True)
                password=None
                body.pop('password',None)
                needed,_=api.login()
                api.password=None
                api.username=None
                if needed=='needs_mfa':
                    from datetime import timedelta
                    self.patch(user_id,lease,{'status':'pending_mfa','encrypted_session':self.encrypt(user_id,'mfa',dump_mfa(api)),
                        'mfa_expires_at':(datetime.now(timezone.utc)+timedelta(minutes=10)).isoformat()})
                    return {'status':'pending_mfa','message':'Enter the verification code sent by Garmin. It expires in 10 minutes.'}
                return self.connected(user_id,lease,api)
            if action=='mfa':
                if self.public_status(row)['status']!='pending_mfa':
                    raise ApiError(409,'The verification session expired. Reconnect Garmin.')
                api=Garmin(return_on_mfa=True)
                restore_mfa(api,self.decrypt(user_id,'mfa',row.get('encrypted_session')))
                api.resume_login({},body['code'].strip())
                return self.connected(user_id,lease,api)
            if row['status']!='connected':
                raise ApiError(409,'Connect Garmin before syncing workouts.')
            saved=self.decrypt(user_id,'tokens',row.get('encrypted_session'))
            api=Garmin()
            api.login(json.dumps(saved['tokens']))
            imported=set(saved.get('imported',[]))
            activities=api.get_activities(0,20)
            candidates=[a for a in activities if str(a.get('activityId','')) not in imported][:3]
            created=duplicates=0
            failures=[]
            started=time.monotonic()
            for item in candidates:
                if time.monotonic()-started>130:
                    break
                activity_id=str(int(item['activityId']))
                try:
                    fit=unpack_fit(api.download_activity(activity_id,api.ActivityDownloadFormat.ORIGINAL))
                    path=f'{user_id}/garmin_{activity_id}_{uuid.uuid4().hex}.fit'
                    self.request('POST','/storage/v1/object/workout-files/'+path,data=fit,
                        headers={'Content-Type':'application/octet-stream'})
                    result=requests.post(self.url+'/functions/v1/submit-workout',headers={
                        'apikey':self.secret,'Authorization':f'Bearer {token}'},json={
                            'source':'fit','file_path':path,'file_name':f'Garmin-{activity_id}.fit',
                            'note':'Imported from the athlete’s connected Garmin account (experimental).'},timeout=60)
                    if not result.ok:
                        # The existing Edge Function removes invalid/unreferenced uploads.
                        failures.append('One workout could not be imported. It may be unsupported or already recorded in Sage.')
                        continue
                    if result.json().get('created'):
                        created+=1
                    else:
                        duplicates+=1
                    imported.add(activity_id)
                    # Save progress and refreshed tokens after each successful import.
                    self.connected(user_id,lease,api,sorted(imported)[-1000:])
                except ValueError:
                    failures.append('One Garmin activity has no supported single-workout FIT file.')
            self.connected(user_id,lease,api,sorted(imported)[-1000:])
            self.patch(user_id,lease,{'last_synced_at':now_iso()})
            return {'status':'connected','imported':created,'duplicates':duplicates,'warnings':failures,
                'message':f'{created} workout(s) submitted for admin review. Sync again to check more recent activities.'}
        except GarminConnectAuthenticationError:
            if action=='sync':
                self.patch(user_id,lease,{'status':'reconnect_required','encrypted_session':None})
            raise ApiError(401,'Garmin login or verification failed. Check your details and reconnect if needed.')
        except GarminConnectTooManyRequestsError:
            raise ApiError(429,'Garmin is limiting requests. Wait before trying again.')
        finally:
            self.patch(user_id,lease,{'lease_id':None,'lease_until':None})
