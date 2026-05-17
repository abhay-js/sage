# Sage — Phase 1 Build Plan

> Endurance training challenge app. Strava-connected, race-based leaderboards, ₹500/year annual pass. Inspired by Naruto — train with the village.

---

## What Phase 1 delivers

A working web app (mobile-first) where:
- A new user can sign up, connect Strava, and pay ₹500
- Admin can verify payment and activate the user
- Active user can join a race and see their score on the leaderboard
- Leaderboard scores are computed from real Strava activity data
- Admin can add races and manage users

Nothing else. No nudges, no referral rewards, no community sessions — those are Phase 3+.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Expo + Expo Router (web now, iOS/Android later — zero rewrite) |
| Styling | NativeWind (Tailwind for React Native) |
| Database + Auth | Supabase |
| Webhooks | Supabase Edge Functions |
| Web deploy | Vercel |

---

## Database — 5 tables

### User
Stores identity, Strava tokens, payment status, and referral code.

Key fields:
- `status` — `pending` or `active`. User is pending until admin manually approves. Only active users appear on leaderboard.
- `role` — `athlete`, `influencer`, `admin`. Add from day one even though only athlete is used now.
- `referral_code` — unique, auto-generated on signup. Permanent, never changes.
- `referred_by` — user_id of who shared the code. Set once at signup, immutable.
- `plan_expires_at` — set to 1 year from activation date by admin.

### Race
Admin-created only. Users cannot create races.

Key fields:
- `sport_types[]` — array of Strava sport_type strings that count toward this race score. e.g. `['Run', 'Ride', 'Swim']` for triathlon, `['Run', 'WeightTraining', 'Rowing']` for Hyrox.
- `challenge_start` / `challenge_end` — the training window. Activities outside this window do not count.
- `entry_fee` — nullable integer. Null means free with annual pass. Reserved for future paid races — do not remove this column.
- `status` — `open`, `closed`, `draft`.

### Entry
One row per user per race. This is where the leaderboard data lives.

Key fields:
- `sage_score` — computed and stored. Never computed on read.
- `sessions`, `total_hours`, `streak` — stored and recomputed by webhook.
- `bonus_points` — separate field for referral points and future bonuses. Added into sage_score.

### ActivityLog
One row per Strava activity per user. This is the scoring source of truth.

Store everything Strava returns: sport_type, date, moving_time, elapsed_time, distance, avg heartrate, max heartrate, suffer score, calories, elevation, avg speed, activity name.

Key rule: store ALL activity types, not just ones matching a race. Scoring filters by sport_type at compute time. One activity row can count toward multiple races.

### Referral
One row per referral relationship.

Key fields:
- `status` — `pending`, `rewarded`, `void`
- `cash_paid` — boolean, admin marks when they've paid out ₹50
- `points_granted` — boolean, auto-set when reward triggers
- Void after 30 days if referred user never activates

---

## Scoring formula

```
Sage Score = (sessions × 10) + (hours × 15) + streak_bonus + bonus_points
```

- Sessions = count of ActivityLog rows matching race.sport_types[] within challenge window
- Hours = sum of moving_time_secs / 3600 for same filter
- Streak = consecutive days from today backwards with at least one qualifying activity
- Streak bonus: 7-day streak → +50, 30-day streak → +200
- Bonus points = referral rewards + future bonuses

All amounts live in a `config.ts` constants file. Never hardcode reward values in component logic.

Backdate rule: activities count from `challenge_start_date`, not from when the user joined. Late joiners lose those past days — intentional, creates urgency to join early.

---

## Strava integration

### OAuth
- Scope: `activity:read_all`
- Use `expo-auth-session` — handles web and native app in one library
- Store access_token, refresh_token, token_expires_at on User row
- Refresh token automatically when expired (Strava tokens last 6 hours)

### Webhook
- Subscribe to Strava webhook events on app setup
- Strava sends POST on: activity created, activity updated, activity deleted
- Must respond 200 within 2 seconds — queue the job, don't block the response
- On create: fetch full activity by ID (1 API call), upsert into ActivityLog, recompute all matching Entry rows
- On delete: remove from ActivityLog, recompute Entry rows
- Leaderboard reads never touch Strava — pure DB query on Entry table

### Backfill (on race join)
- Triggered when admin activates a user AND that user joins a race
- Fetch all Strava activities from challenge_start to now (paginated, 200 per page)
- Upsert all into ActivityLog
- Compute initial Entry score
- After backfill, webhook handles all future updates incrementally

### API cost at 1000 athletes
- Normal day: ~1000 activities → ~1000 API calls → within 2000/day default limit
- Heavy weekend: ~2500 activities → may breach limit → request increase from Strava once at ~500 users
- Streak computed from ActivityLog (DB query) — zero additional Strava calls needed

---

## App screens — 5

### Home
- Two sections on one screen: "Your races" and "Discover races"
- Your races: one card per joined race showing sage_score, rank, sessions, hours, days to race, challenge progress bar
- Discover races: all open races not yet joined, filterable by type (triathlon, hyrox, run, cycling)
- Join button on discover cards — routes to Village tab if not yet a member, or directly creates Entry if already active

### Ranks
- Race selector at top (pill tabs for each joined race)
- Filter pills: Overall score / Sessions / Hours / Streak
- Leaderboard rows — rank, avatar initials, name, score, streak
- Your row always highlighted and pinned visible even when scrolled
- Note below race selector explains which sport_types count for this race's score

### Training Log
- Filter pills: All / per joined race
- Activity feed read from ActivityLog — sport icon, name, date, duration, distance
- Points earned shown per activity (filtered to selected race)
- Clear note explaining which activities count for which race

### Village
- Single plan: ₹500/year — all races included, no per-race fee
- UPI QR code + UPI ID shown
- "Upload payment screenshot" button — saves file to Supabase Storage
- Referral code display + copy invite link button
- Referral list showing: friend name, status (pending / rewarded), earnings
- Cash earnings total + "Request payout" button (triggers manual admin payout)

### Profile
- Strava connection status + reconnect option
- Streak calendar — dot per day, filled if any qualifying activity
- All-time stats: total sessions, total hours, total races joined
- Account status with plan expiry date
- Sign out

---

## Auth and routing flow

```
Open app
  → not logged in         → Signup / Login screen
  → logged in, pending    → Pending screen ("Your payment is being verified")
  → logged in, active     → Main app (Home tab)
  → logged in, admin      → Admin panel (/admin)
```

Signup steps:
1. Name + email or phone
2. Optional referral code entry
3. Connect Strava (OAuth)
4. Pay ₹500 — scan QR, upload screenshot
5. Pending screen until admin activates

---

## Admin panel — /admin

Only accessible to users with `role = admin`. Completely separate from the main app layout.

### Payments tab
- List of pending users
- Each row: name, contact, Strava connected status, screenshot link, signup date
- Approve → sets status = active, plan_expires_at = now + 1 year, triggers backfill for any races already joined
- Reject → sets status = suspended

### Races tab
- List of all races with status
- Add race form: name, type, race_date, challenge_start, challenge_end, sport_types, city, status
- Edit existing races (block edits to challenge_start after athletes have joined)

### Athletes tab
- Full user list filterable by status
- Per row: name, status, plan expiry, races joined, last activity date
- Manual resync button — reruns backfill for a specific user + race
- Mark referral paid — sets cash_paid = true on a Referral row

---

## Payment flow

1. User scans UPI QR in Village tab
2. Pays on GPay / PhonePe / any UPI app, adds name + race in remarks
3. Uploads screenshot in app → stored in Supabase Storage at `payment-screenshots/{user_id}`
4. Admin sees new pending entry in admin panel with screenshot
5. Admin verifies and approves → user activated
6. If user had already joined a race while pending → backfill runs immediately on approval

---

## Referral flow

1. User A shares referral code (e.g. `YOGI-7X2K`)
2. User B signs up with code → `referred_by` set, Referral row created as `pending`
3. User B pays and gets activated by admin
4. Daily cron job checks all pending Referral rows
5. If referred user has activity across 7 distinct days → status = `rewarded`
6. On reward: bonus_points += 100 on all active Entry rows of User A, points_granted = true
7. cash_paid stays false until admin manually pays ₹50 and marks it in admin panel
8. If referred user never activates within 30 days → status = `void`

---

## Folder structure

```
sage/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── strava.tsx
│   ├── (app)/
│   │   ├── _layout.tsx          ← tab bar
│   │   ├── index.tsx            ← Home
│   │   ├── ranks.tsx
│   │   ├── log.tsx
│   │   ├── village.tsx
│   │   └── profile.tsx
│   ├── (admin)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx            ← dashboard
│   │   ├── payments.tsx
│   │   ├── races.tsx
│   │   └── athletes.tsx
│   ├── pending.tsx              ← waiting for approval
│   └── _layout.tsx              ← root layout + auth redirect
├── components/
│   ├── RaceCard.tsx
│   ├── LeaderboardRow.tsx
│   ├── ActivityItem.tsx
│   └── StreakDots.tsx
├── lib/
│   ├── supabase.ts
│   ├── strava.ts
│   ├── scoring.ts
│   └── config.ts                ← all reward amounts + constants here
├── hooks/
│   ├── useAuth.ts
│   ├── useRaces.ts
│   └── useEntries.ts
├── types/
│   └── index.ts
└── supabase/
    └── functions/
        ├── strava-webhook/      ← handles incoming Strava events
        └── backfill-entry/      ← runs on activation + race join
```

---

## config.ts — constants (never hardcode these values elsewhere)

```
ANNUAL_PASS_PRICE_INR     = 500
REFERRAL_CASH_REWARD_INR  = 50
REFERRAL_POINTS           = 100
REFERRAL_ACTIVATION_DAYS  = 7
REFERRAL_VOID_DAYS        = 30
SCORE_PER_SESSION         = 10
SCORE_PER_HOUR            = 15
STREAK_BONUS_7D           = 50
STREAK_BONUS_30D          = 200
UPI_ID                    = "sageofrace@okicici"
```

---

## Environment variables needed

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_STRAVA_CLIENT_ID
EXPO_PUBLIC_STRAVA_CLIENT_SECRET
EXPO_PUBLIC_STRAVA_REDIRECT_URI
STRAVA_WEBHOOK_VERIFY_TOKEN       ← Edge Function secret only
SUPABASE_SERVICE_ROLE_KEY         ← Edge Function secret only, never expose to client
```

---

## Future features — do not build now, do not break later

| Feature | What to keep in mind now |
|---|---|
| Race entry fee | `entry_fee` column already on Race table (nullable). Don't remove it. Payment flow already exists — just add fee check before Entry is created |
| Fitness influencer monetisation | `role` field on User already has `influencer` value. Referral reward is in config not hardcoded — easy to make configurable per influencer |
| Community sessions (group rides, runs) | `bonus_points` on Entry already handles any point addition. Session attendance just calls the same bonus update function |

---

## Phase 1 complete when

- [ ] All 5 tables created in Supabase with correct fields and RLS policies
- [ ] User can sign up, connect Strava, upload payment screenshot
- [ ] Admin can approve user → user becomes active, plan_expires_at set
- [ ] Active user can join a race → backfill runs → score appears on leaderboard instantly
- [ ] Strava webhook updates score in real time when new activity is logged on Strava
- [ ] Admin can add a new race with sport_types, challenge window, and city
- [ ] All 5 app screens render correctly on mobile web
- [ ] /admin is accessible only to users with role = admin
- [ ] Pending users see waiting screen, cannot access main app or leaderboard
- [ ] Referral code generated on signup, referral row created when code is used
