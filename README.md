# Sage — Endurance Training Challenge App

A React Native app for endurance athletes in India. Athletes join training challenges, sync workout data, compete on leaderboards, and host/join group training sessions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native · Expo SDK 54 · Expo Router v3 |
| Styling | NativeWind (Tailwind CSS) |
| Backend | Supabase (Postgres · Auth · Storage · Edge Functions) |
| Activity sync | Strava OAuth + Webhook · Apple Health · Health Connect |
| Build & deploy | EAS Build · EAS Submit |

---

## Getting Started

### Prerequisites

- Node.js v20+ (via nvm)
- Expo Go on your phone (iOS/Android)
- Supabase project
- Strava API application

### Install

```bash
npm install --legacy-peer-deps
```

### Environment variables

Create `.env.local` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRAVA_CLIENT_ID=your-strava-client-id
EXPO_PUBLIC_STRAVA_CLIENT_SECRET=your-strava-client-secret
```

### Run

```bash
export PATH="/Users/$(whoami)/.nvm/versions/node/v20.20.2/bin:$PATH"
node node_modules/expo/node_modules/@expo/cli/build/bin/cli start --clear
```

Open Expo Go → connect to `exp://<your-local-ip>:8081`

---

## Database Setup

Run these SQL files in order in **Supabase → SQL Editor**:

```
supabase/sessions-schema.sql          # group_sessions + session_enrollments tables
supabase/sessions-migration.sql       # status constraint expansion + count trigger
supabase/session-host-functions.sql   # accept / reject / mark-attendance RPCs
supabase/session-functions-v2.sql     # undo rejection + reactivate + map_link column
supabase/session-functions-v3.sql     # host_complete_session RPC
supabase/location-migration.sql       # latitude + longitude columns
supabase/dev-users.sql                # test accounts (dev only)
```

### Core schema (manually create or import)

The main tables are: `users`, `races`, `entries`, `activity_logs`, `referrals`, `group_sessions`, `session_enrollments`.

Full column definitions are in `memory/db_schema.md`.

---

## Architecture

### Auth flow

```
Strava OAuth → exchange code → find-or-create Supabase user
email: athlete.{strava_id}@strava.app
password: strava_{strava_id}_sage
→ save tokens → router routes by user.status + user.role
```

### Activity sync

```
Strava webhook (real-time push)
  └─► strava-webhook edge function
        └─► upserts activity_logs
              └─► recalculates entries scores

backfill-entry edge function (on race join)
  └─► incremental fetch (only since last known activity_date)
        └─► upserts activity_logs → recomputes score

Apple Health / Health Connect (manual import)
  └─► lib/healthSync.ts → upserts activity_logs
```

### Scoring

```
sage_score = (sessions × 10) + floor(total_hours × 15) + bonus_points
```

Constants in `lib/config.ts`.

---

## Features

### Races & Leaderboard
- Athletes join open races and compete on a live leaderboard
- Leaderboard sorts by score / sessions / hours / streak
- Race detail screen: **Ranks** tab · **Awards** tab (13 achievement badges) · **Tips** tab (contextual training tips)
- Race cards tap to open race detail

### Group Sessions
- Hosts create cycling/running sessions with requirements (FTP, pace, ride type)
- Location picker with GPS coordinates for proximity search
- Athletes request to join → host accepts/rejects
- After acceptance: WhatsApp group link revealed
- Host tabs: **Requests** · **Enrolled** · **Settings**
- Host marks attendance (attended / no-show) then marks session Completed
- Completing auto-promotes enrolled → attended, locks all changes
- Archived sessions can be re-activated (resets all enrollments to 0)
- Sessions browse: filter by sport, **📍 Nearby** (20km radius), **⚡ My Sessions**

### Activity Log
- Full activity history with race filter
- Summary strip (session count, total time)

### Profile
- All-time stats: score, sessions, hours, races, streak
- Distance breakdown: run km / ride km / swim m
- HR zone training breakdown (Zone 1–5)
- Group sessions attended list
- Training streak heatmap
- Strava connection with manual Sync Now
- Apple Health / Health Connect import (dev build only)

### Village
- Annual pass (₹500/year) — UPI payment screenshot upload
- Referral system (₹50 cash + 100 pts per activated referral)

---

## Navigation

```
app/
  _layout.tsx              Root (auth routing)
  pending.tsx              Role selector for new users
  (auth)/login.tsx         Strava OAuth login
  (auth)/strava.tsx        Strava reconnect
  (admin)/                 Admin dashboard
  (app)/
    _layout.tsx            Tab bar (6 tabs + 4 hidden)
    index.tsx              Home — races
    ranks.tsx              Global leaderboard
    sessions.tsx           Sessions browse
    log.tsx                Activity log
    village.tsx            Community & membership
    profile.tsx            User profile & stats
    race-detail.tsx        Race leaderboard + awards + tips
    session-detail.tsx     Session detail + host controls
    session-create.tsx     Create session
    session-edit.tsx       Edit session
```

---

## Edge Functions

Deploy with Supabase CLI:

```bash
supabase functions deploy backfill-entry
supabase functions deploy strava-webhook --no-verify-jwt
```

Set secrets:
```bash
supabase secrets set STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=xxx
```

### Strava webhook registration

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_ID \
  -F client_secret=YOUR_SECRET \
  -F callback_url=https://your-project.supabase.co/functions/v1/strava-webhook \
  -F verify_token=SAGE_WEBHOOK_VERIFY
```

---

## Development Tools

### Dev account switcher

A purple **DEV** pill floats in the bottom-left on all screens (only in `__DEV__` mode). Tap to switch between 4 test accounts instantly.

| Account | Email | Password | Role |
|---|---|---|---|
| Athlete 1 | dev.user1@sage.test | devuser1sage | athlete |
| Athlete 2 | dev.user2@sage.test | devuser2sage | athlete |
| Athlete 3 | dev.user3@sage.test | devuser3sage | athlete |
| Admin | dev.admin@sage.test | devadminsage | admin |

Create these in Supabase Auth dashboard, then run `supabase/dev-users.sql`.

---

## Publishing

### Build

```bash
npm install -g eas-cli
eas login
eas build:configure

# Production builds
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Set EAS secrets

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_STRAVA_CLIENT_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_STRAVA_CLIENT_SECRET --value "..."
```

### Submit

```bash
eas submit --platform ios      # App Store (Apple Developer account required — $99/yr)
eas submit --platform android  # Google Play ($25 one-time)
```

### OTA updates (JS-only changes, no App Store review)

```bash
npx expo install expo-updates
eas update --branch production --message "description of change"
```

---

## Key constants (`lib/config.ts`)

| Constant | Value |
|---|---|
| Annual pass | ₹500 |
| Score per session | 10 pts |
| Score per hour | 15 pts |
| Referral cash reward | ₹50 |
| Referral points | 100 pts |
| UPI ID | sageofrace@okicici |

---

## Health Platform Integration

Apple Health (iOS) and Health Connect (Android) import requires a **development build** — it does not work in Expo Go.

```bash
# Build a dev client with HealthKit entitlement
eas build --profile development --platform ios
npx expo start --dev-client
```

Supported devices via health platforms: Apple Watch, Garmin, Polar, Fitbit, Suunto, Wahoo.
