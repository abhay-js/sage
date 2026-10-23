#!/bin/zsh
cd "${0:A:h:h}" || exit 1
./.local/garmin/venv/bin/python scripts/garmin-readonly.py
printf '\nPress Enter to close this test.\n'
read
