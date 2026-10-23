# Local Garmin workout test

This is a read-only experiment with `python-garminconnect`, not a public Sage Garmin integration. It uses unofficial Garmin services. Garmin developer approval is not used by the library, but this does not establish permission to offer it commercially.

Reviewed source: `cyberjunky/python-garminconnect` commit `218e72ca5459e014435fc2d94fd18bd601fa0c14` (package 0.3.17). Python 3.12 or later is required.

## Run

Double-click `scripts/garmin-local.command` or run from the Sage folder:

```sh
.local/garmin/venv/bin/python scripts/garmin-readonly.py
```

Enter Garmin email/password and any MFA code in Terminal. Password and MFA input are hidden; do not send them in chat. Select one of the ten most recent workouts. The helper only authenticates, lists activities and downloads the original activity file. It does not edit Garmin activities or upload anything to Sage.

The single FIT file is written to `.local/garmin/exports/garmin-<activity-id>.fit`. ZIP member paths are never extracted. Downloads and the FIT payload are bounded; multi-file FIT archives are rejected so the wrong session is not imported. Sage's existing backend performs the full FIT CRC/parser validation when uploaded.

Open Sage's Activity → Add activity → FIT upload and choose the downloaded file. On macOS, Cmd+Shift+G in the file picker lets you enter the hidden export-folder path. Submitted workouts remain pending until an administrator approves them.

## Local data

The Python environment, login tokens, exported activity and progress status are stored under `.local/garmin/`, ignored by Git. Token/export folders have owner-only permissions. The helper does not save passwords or raw API responses. Tokens can provide persistent account access and remain on this computer for later runs. Removing local tokens does not revoke Garmin-issued tokens.

`status.json` contains progress and the downloaded file path or error class, never credentials or raw workout samples. No tokens or FIT files are included in the web deployment, which uses only the static web export.

## Recreate the environment

```sh
python3 -m venv .local/garmin/venv
.local/garmin/venv/bin/python -m pip install -r scripts/garmin-requirements.txt
```

If saved tokens stop working, the helper stops rather than repeatedly attempting login. Ask for a fresh-login reset; do not share the token file.
