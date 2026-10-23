# Sage spec gap analysis — 2026-10-08

The implementation request authorizes the audit and implementation together. The example prompt in §110 is guidance, not a separate approval gate. Keep the current light Sage palette, five athlete tabs, email authentication and Apple Health integration. Google remains deferred by the user's earlier instruction.

| Surface / model | Status | Existing paths and reusable pieces | Missing behavior / priority |
|---|---|---|---|
| Email authentication | Partial | `app/(auth)/login.tsx`, `signup.tsx`, `context/AuthContext.tsx` | Password confirmation, recovery, onboarding route; P0 |
| Role protection | Existing / partial | `app/_layout.tsx`, protected RPCs in review/level migrations | Some legacy admin writes use direct queries; new APIs must check database admin role; P0 |
| Athlete onboarding | Missing | `app/pending.tsx` has sport selection, `DatePickerField`, `SageUI` | Five steps, validation, typed profile persistence and skip Health; P0 |
| Profile | Partial | `app/(app)/profile.tsx`, `profile-details.tsx` | Identity, sports, events, goals, level, edit and lightweight totals; P0 |
| Home | Partial | `app/(app)/index.tsx`, `MountainArt`, `useEntries`, `useActivities` | Unified active challenge, quick Health sync, today's summary and sync result; P1 |
| Challenges | Conflicting / partial | `app/(app)/challenges.tsx`, `challenge-detail.tsx`, `race-detail.tsx`, `ChallengeOverview` | Both `races/entries` (Mountain scoring) and `challenges/challenge_participants` (target progress) exist. Extend races/entries as main scored challenges; preserve legacy records. Add eligibility/status/sections; P0 |
| Join flow | Partial | Direct inserts in challenges screen | Server checks status, membership and level; snapshot level at join and preserve history; P0 |
| Scoring | Partial | `lib/scoring.ts`, Edge `_shared/scoring.ts`, review SQL | Global formula, no challenge config, daily cap or persisted score breakdown. Add authoritative backend scoring with separate challenge activities; P0 |
| Bonuses / rules / rewards | Partial | `ChallengeOverview` and old detail show generic content | Challenge-configured editors, condition evaluation, terms and reward imagery; P1 |
| Workout sync | Existing / partial | `lib/healthSync.ts`, `hooks/useActivities.ts`, route map | Keep Health dedupe, preserve full start timestamp, count newly imported workouts, scoring/result API; P0 |
| Workout moderation | Existing | Admin workouts screen, review RPC/audit, protected reviews | Spec only verified workouts count; pending imports await approval under new configuration; P0 |
| Workout result | Missing | Existing workout detail modal | Actual score delta, previous/new rank, breakdown and climb CTA; P1 |
| Mountain | Partial | `app/(app)/ranks.tsx`, `Climber`, `MountainArt` | Score-aware bounded spacing, paginated list, around-me RPC, summit and movement; P1 |
| Admin athletes | Partial | `app/(admin)/athletes.tsx`, `useAdminLevels` | Latest 90 records, backend analytics, suggestion reasons, confirmed assignments and immutable level history; P0 |
| Admin challenges | Partial | Admin races, `race-management.tsx`, eligibility RPC | Full editor/duplicate/publish, scoring/bonuses/rules/rewards and historical participants; P1 |
| Empty/loading/errors | Partial | `Empty`, shared palette/components | Retry and skeletons for new fetches; P1 |
| Offline | Missing | SecureStore currently stores auth | Last successful data cache with offline notice and sync restriction where practical; P2 |
| Types | Partial | `types/index.ts` | Keep lower-case stored roles and numeric level IDs compatible. Typed sport/profile/config/audit/result contracts; P0 |
| Typecheck | Existing failure | `app/(app)/session-detail.tsx` | Six captured nullable-session errors must be corrected for definition of done; P0 |

Implementation order: profile/schema foundation → onboarding/auth → level history/analytics → challenge config/editor and enforced join → authoritative scoring/audit → athlete challenge surfaces/result → paginated Mountain and Home → validation/build/install. No fake challenge counts, scores, rewards, or level suggestions will be added.
