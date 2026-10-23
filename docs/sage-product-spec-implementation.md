# Sage product spec implementation

Implemented on 2026-10-08 using the existing light Sage theme and five athlete tabs. Google sign-in remains deferred as requested.

## Athlete app

- Email signup confirmation validation, sign-in and password recovery routes.
- Five-step onboarding and editable identity, sports, events, goals and training profile; optional photo upload and Health connection.
- Approved level is read-only for athletes; unassigned athletes can browse challenges.
- Configured challenges with eligibility, join confirmation, overview, points, bonus missions, rules, rewards and standings.
- Join validation runs on the server and preserves level at join. Existing imported workouts remain separate from scoring records.
- Apple Health import counts new records, preserves start timestamps and deduplicates by user and source workout ID.
- Workout results show actual points/rank changes, athletes passed and next rival gap. Newly imported workouts remain pending until approved.
- Per-workout challenge audit explains counted, pending, rejected, below-threshold and daily-cap decisions.
- Mountain focuses on three rivals above/below, bounded score-based spacing, summit, paged list/search and Back to Me. Rankings come from the server.
- Profile includes actual training totals and challenge achievements.

## Admin app

- Athlete search and level filters; latest 90 workout records, date coverage, sport metrics, weekly volume, distribution and consistency.
- Provisional volume-based level suggestions, confirmed assignments with notes, immutable assignment history.
- Challenge creation/editing/duplication/publishing/closing, configured eligibility, sports, thresholds, daily caps, six mission types, ordered rules and rewards.
- Editing a challenge recalculates participant scores. Revision checks protect against stale admin saves.
- Participant review links show current level, original join level and points; workout moderation retains decision history.

## Backend and verification

The migration `supabase/migrations/20261008150758_sage_product_spec.sql` was applied transactionally to the configured project `zkznmylxdbjqhxclhkjn`. It preserves legacy challenges as session/hour configurations, while new challenges use sport thresholds. Only approved workouts earn points. Existing manual/referral bonus points are preserved separately.

Existing broad policies were constrained: private profiles and raw workouts are visible only to owner/admin, direct score writes are denied, and membership changes require admin authority. Public standings expose names, photos and scores without private health/profile fields. Changed verified imports return to pending review; identical re-imports preserve decisions.

All import functions call the same SQL scoring engine. Strava token exchange now runs on the server instead of embedding its client secret in app code. Google, direct Garmin, background sync, live GPS recording and automatic final level assignment remain outside the initial MVP scope.

Checks: TypeScript, static web export, signed iPhone Release build, isolated PostgreSQL tests (501-athlete paging/ties/search/window, 90-record analysis, threshold parity, caps/mission scoring, idempotence, protected joins, history and privacy), and read-only live API probes using seeded admin/athlete accounts.

The in-memory data cache is scoped by account and retains last successful responses while the app stays open. Restart-persistent offline data and background imports are deferred. Email delivery still depends on the Supabase mail configuration; external inbox delivery was not tested. UI automation is unavailable in this environment, so screens require final interactive review on the installed app.
