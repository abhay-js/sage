# Health imports in Sage

Connect in Profile → Workout connections. An enabled connection imports on app launch,
return to the foreground, and every five minutes while active. Sync now remains available.
Sage does not continuously import when closed. Preferences belong to the current Sage account
on this device. Stop automatic imports disables future reads; existing imported workouts remain.
Revoke permissions separately in Apple Health or Health Connect.

## iPhone and Garmin
1. Install the updated native Sage build (Health does not work in Expo Go or on the website).
2. Garmin Connect → More → Settings → Connected Apps → Apple Health. Enable available workout/distance categories.
3. Sync a completed run and an indoor ride while Garmin Connect stays open. Confirm each appears in Apple Health.
4. Sage → Profile → Workout connections → Connect Apple Health. Allow workouts and desired measurements.
5. Check Recent imported workouts and the activity's challenge score breakdown. Record sport, duration, distance,
   source name, available metrics and pending/approved state. Approve through the admin account, then verify points.
6. If Garmin did not send distance, a distance rule earns no points; eligible duration rules still use duration.
   GPS routes and detailed Garmin workout heart-rate samples are not exported by Garmin to Apple Health.
7. Reopen Sage and sync again: there must be no second copy of the same Health workout. Verify an update to source
   distance returns previously approved workouts to review under existing backend rules.

## Android
The app supports Health Connect-capable devices; Garmin's native sharing requires Android 14 or later.
Enable Garmin Connect's Health Connect sharing, verify the session in Health Connect, then grant Sage
Exercise sessions and optional Distance, Heart rate, Active calories and Elevation permissions.
Each optional record is read from the exercise's own app and time window. Cross-day totals are excluded.
Do not assume every recording app provides every record. GPS routes are not imported in this iteration.

The Android 14 emulator can validate app startup, permission UI and privacy access, but it has no real
Garmin watch history. Repeat import/scoring tests on a real Android phone before athlete rollout.

## Indoor rides
Use health imports first. When distance/detail is missing, export the original FIT file from Garmin Connect,
Zwift or MyWhoosh and upload through Workout connections → Upload a FIT workout. Garmin exports may be ZIPs:
extract the FIT first. Mention the existing Health activity in the note so the admin rejects the incomplete
copy and approves the FIT submission. Cross-source health/FIT duplicate detection is not yet automatic.

## Developer checks
- `node scripts/test-health-imports.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run build:web`
- `node scripts/verify-workout-review-live.cjs` (seeded test accounts, live backend checks)
- `expo prebuild --platform android --no-install`, then Gradle `:app:assembleDebug`

The HealthKit duration patch runs after npm install. Rebuild iOS to include active duration in getSamples.
The Android config plugins register Health Connect's permission handler and open the public privacy page
from the health permission rationale entry points. An Android native rebuild is required after adding them.
