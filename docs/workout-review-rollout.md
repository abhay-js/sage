# Workout review rollout

The app uses Supabase project `zkznmylxdbjqhxclhkjn`. On 2026-10-07, owner-account CLI login restored access. The review SQL was applied in a transaction and all three scoring Edge Functions were deployed. A live read-only test confirmed admin listing (202 workouts) and athlete access denial.

Using an account with access to that project:

1. Apply `supabase/migrations/20261007152635_workout_review.sql` in its SQL editor, or link the CLI to this project and run `supabase db push --linked` after reviewing all pending migrations.
2. Deploy the updated scoring functions: `supabase functions deploy strava-webhook`, `supabase functions deploy backfill-entry`, and `supabase functions deploy healthkit-sync`. Deploy these together with the migration so sync respects rejected workouts.
3. Sign into Sage using an existing administrator account. Open **Workouts**, inspect an athlete's workout, and approve or reject it. Rejection requires a reason.

Pending workouts keep their points. Rejected workouts lose their race points; approving them restores their points. Bonus points remain intact. Reviews persist across re-imports, record an audit history, and reject stale concurrent decisions.

Admin privileges must be assigned by a trusted project owner through the database. Users cannot grant themselves admin privileges. GPS routes remain on the athlete's iPhone and are not available to administrators.

Local verification uses `scripts/test-workout-review.cjs` with an isolated PGlite database. It covers authorization, RLS, role escalation, review conflicts, score recalculation, audit history, and re-import persistence.
