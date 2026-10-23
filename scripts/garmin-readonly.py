#!/usr/bin/env python3
"""Local Garmin activity download experiment. No Garmin write methods or Sage uploads."""
from __future__ import annotations

import argparse
from getpass import getpass
import io
import json
import logging
import os
from pathlib import Path
import sys
import zipfile

BASE = Path(__file__).resolve().parents[1] / '.local' / 'garmin'
MAX_FIT_BYTES = 10 * 1024 * 1024
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024


def unpack_fit(data: bytes) -> bytes:
    """Read one bounded FIT payload without extracting archive filenames to disk."""
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise ValueError('Garmin download is too large for this test.')
    if zipfile.is_zipfile(io.BytesIO(data)):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if len(archive.infolist()) > 100:
                raise ValueError('Unexpected number of files in Garmin download.')
            candidates = [entry for entry in archive.infolist()
                          if not entry.is_dir() and entry.filename.lower().endswith('.fit')]
            if len(candidates) != 1:
                raise ValueError('Choose a single-session activity with one original FIT file.')
            entry = candidates[0]
            if entry.file_size > MAX_FIT_BYTES:
                raise ValueError('FIT files must be 10 MB or smaller for Sage.')
            with archive.open(entry) as source:
                data = source.read(MAX_FIT_BYTES + 1)
    if len(data) > MAX_FIT_BYTES:
        raise ValueError('FIT files must be 10 MB or smaller for Sage.')
    if len(data) < 14 or data[0] not in (12, 14) or data[8:12] != b'.FIT':
        raise ValueError('Garmin did not return a valid FIT file header.')
    return data


def private_directory(path: Path) -> None:
    if path.is_symlink():
        raise ValueError('Local Garmin folders must not be symbolic links.')
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.chmod(0o700)


def status(state: str, **details: str) -> None:
    # Progress only: never credentials, tokens or raw Garmin responses.
    path = BASE / 'status.json'
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as target:
        json.dump({'state': state, **details}, target)


def run(activity_id: int | None = None) -> None:
    from garminconnect import Garmin

    logging.disable(logging.CRITICAL)
    os.umask(0o077)
    private_directory(BASE)
    tokens = BASE / 'tokens'
    exports = BASE / 'exports'
    private_directory(tokens)
    private_directory(exports)
    print('\nSage — local Garmin test\n')
    print('This downloads one workout. It does not edit Garmin data or upload to Sage.')
    print('Garmin credentials are entered here; do not paste them into chat.')

    if (tokens / 'garmin_tokens.json').exists():
        status('connecting')
        api = Garmin()
        try:
            api.login(str(tokens))
        except Exception:
            print('Saved login could not be used. Run again with a fresh Garmin login.')
            status('login_needed')
            return
    else:
        status('awaiting_login')
        email = input('\nGarmin email: ').strip()
        password = getpass('Garmin password (hidden): ')
        if not email or not password:
            raise ValueError('Email and password are required.')
        api = Garmin(email=email, password=password,
                     prompt_mfa=lambda: getpass('Garmin MFA code (hidden): ').strip())
        password = None
        email = None
        status('connecting')
        api.login(str(tokens))

    print('\nConnected. Login tokens are stored locally with restricted permissions.')
    if activity_id is None:
        status('listing_workouts')
        activities = api.get_activities(0, 10)
        if not isinstance(activities, list) or not activities:
            print('No recent Garmin activities were found.')
            status('no_activities')
            return
        print('\nChoose one recent workout to download:\n')
        for number, item in enumerate(activities, 1):
            print(f"{number}. {item.get('activityName', 'Workout')} — {item.get('startTimeLocal', '')}")
        status('awaiting_workout_selection')
        selected = input('\nWorkout number (or q to cancel): ').strip()
        if selected.lower() == 'q':
            status('cancelled')
            return
        if not selected.isdigit() or not 1 <= int(selected) <= len(activities):
            raise ValueError('Select a number from the displayed list.')
        activity_id = int(activities[int(selected) - 1]['activityId'])

    if activity_id <= 0:
        raise ValueError('Activity ID must be a positive number.')
    status('downloading')
    download = api.download_activity(str(activity_id), api.ActivityDownloadFormat.ORIGINAL)
    fit = unpack_fit(download)
    output = exports / f'garmin-{activity_id}.fit'
    if output.exists():
        if output.is_symlink() or output.read_bytes() != fit:
            raise ValueError('An existing export differs. It has not been overwritten.')
    else:
        fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'wb') as target:
            target.write(fit)
    status('downloaded', file=str(output))
    print(f'\nDownloaded: {output}')
    print('\nNext: open Sage → Activity → Add activity → FIT upload and choose this file.')
    print('If this folder is hidden in the file picker, press Cmd+Shift+G and paste its path.')
    print('Sage validates the FIT file; submitted workouts still require admin approval.')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--activity-id', type=int, help='Download a known activity from your own Garmin account')
    args = parser.parse_args()
    if not sys.stdin.isatty():
        print('Run in Terminal so credentials can be entered privately.')
        return 1
    try:
        run(args.activity_id)
        return 0
    except (KeyboardInterrupt, EOFError):
        if BASE.exists():
            status('cancelled')
        print('\nCancelled.')
        return 1
    except ValueError as error:
        if BASE.exists():
            status('error', kind='validation')
        print(f'\n{error}')
        return 1
    except Exception as error:
        # Raw authentication exceptions can contain account/session details.
        if BASE.exists():
            status('error', kind=type(error).__name__)
        print(f'\nGarmin test failed ({type(error).__name__}).')
        print('Check credentials/MFA or try later if Garmin is unavailable or rate-limiting.')
        return 1


if __name__ == '__main__':
    sys.exit(main())
