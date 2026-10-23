# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (Expo Go)
npm start

# Platform-specific dev
npm run ios
npm run android
npm run web


# Build static web export
npm run build:web
```

No lint or test scripts are configured. Node 20 is required (`engines.node: "20.x"`).

## Architecture

**Sage** is a React Native endurance training challenge platform (India-focused). Cross-platform: mobile via Expo Go / EAS Build, web via Vercel static export.

- **Routing**: Expo Router v6 (file-based). Three layout groups: `(auth)`, `(app)`, `(admin)`
- **Styling**: NativeWind v4 (Tailwind for React Native). Dark-only, hardcoded.
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions in Deno)
- **Activity sync**: Strava OAuth + webhook, Apple Health (iOS), Health Connect (Android)

## Routing & Auth Guard

`app/_layout.tsx` is the single auth guard. It reads `useAuth()` and redirects based on `user.status` + `user.role`:

| State | Route |
|---|---|
| No user | `/(auth)/login` |
| `role === 'admin'` | `/(admin)` |
| `status === 'pending'` | `/pending` (role selector, awaiting payment) |
| `status === 'active'` | `/(app)` |

`/(app)/_layout.tsx` defines the tab bar. **Hidden screens** (no tab icon, navigate via `router.push`) live in the same `(app)` group: `race-detail`, `session-detail`, `session-create`, `session-edit`. To add a hidden screen, define it in `app/(app)/` and do NOT add it to the `tabs` array in the tab layout — use `href: null` if it appears as a tab entry.

## Styling

Use the Sage custom color palette; never hardcode hex values:

```
bg-sage-bg        #0a0a0a  (page background)
bg-sage-surface   #1a1a1a  (cards, modals)
border-sage-border #2a2a2a
text-sage-text    #f5f5f5
text-sage-muted   #737373
text-sage-green   #4ade80  (primary accent)
text-sage-orange  #fb923c  (secondary accent)
```

## Data Layer

All data fetching is in `hooks/`. Hooks call Supabase directly via `lib/supabase.ts`. No ORM, no Redux/Zustand — just typed Supabase queries returning the `User`, `Race`, `Entry`, `GroupSession`, etc. types from `types/index.ts`.

**Prefer RPCs over direct table queries for writes that touch multiple tables** — see `supabase/session-functions-v*.sql` for examples. RLS is partially enabled; server-side RPCs bypass it when needed for host/admin actions.

## Platform-Specific Files

Use the `.web.tsx` suffix for web overrides. Metro resolves `DatePickerField.web.tsx` over `DatePickerField.tsx` on web. Currently used for date pickers (native `DateTimePicker` vs HTML `<input type="date">`).

## Shared Scoring Logic

`lib/scoring.ts` (client) and `supabase/functions/_shared/scoring.ts` (Edge Functions) must stay in sync — they implement the same formula. When changing score logic, update both.

Constants (pass price, referral rewards, score rates, UPI ID) live in `lib/config.ts`.

## Development Tools

`DevSwitcher` (purple pill, bottom-left) appears only in dev mode. It switches between 4 test accounts (`supabase/dev-users.sql`) for testing different roles and states without re-authenticating.

## Edge Functions

Located in `supabase/functions/`:
- `strava-webhook`: Handles real-time Strava activity POSTs → upserts `activity_logs` → recalculates scores
- `backfill-entry`: Called when a user joins a race; incremental fetch of Strava activities since last known date

Deploy with `supabase functions deploy <name>`.
