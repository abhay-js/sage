# Sage × Strava Challenge Dashboard MVP

## Objective
Build an internal dashboard for Sage Challenge #1 that:
- Connects athletes through Strava OAuth.
- Retrieves their Strava activities during the challenge.
- Validates eligible activities.
- Calculates configurable Sage points.
- Displays an admin and athlete leaderboard.

This is an MVP for ~14 athletes.

## Current implementation note
The existing Expo app now includes a simple athlete dashboard on `app/(app)/index.tsx`.
It summarizes total Sage score, sessions, best streak, joined challenges, joined races,
live drops, and the next active challenge or race from existing Supabase-backed hooks.

## Critical constraints
- Do NOT use Strava Club Activities as the core data source.
- Athlete IDs alone are not enough to retrieve activities.
- Each athlete must authorize Sage through Strava OAuth.
- Keep client secrets, access tokens, and refresh tokens server-side.
- Never expose Strava secrets/tokens to the frontend.
- Do not bypass Strava's athlete connection/API limits.
- Build the architecture so additional fitness providers can be added later.

## Stack
### Backend
- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

## Environment
Create `.env.example`:

```env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=
DATABASE_URL=
CHALLENGE_START=
CHALLENGE_END=
```

Never commit `.env`.

## Database

### Athlete
```text
id
name
email
fitnessLevel
primarySport
stravaAthleteId
stravaAccessTokenEncrypted
stravaRefreshTokenEncrypted
stravaExpiresAt
createdAt
updatedAt
```

Fitness levels:
```text
BEGINNER
INTERMEDIATE
ADVANCED
ELITE
```

### Challenge
```text
id
name
description
startDate
endDate
status
createdAt
```

### ChallengeParticipant
```text
id
challengeId
athleteId
startingPoints
totalPoints
rank
```

### Activity
```text
id
stravaActivityId
athleteId
challengeId
sportType
name
startDate
distance
movingTime
elapsedTime
elevationGain
averageSpeed
averageHeartRate
maxHeartRate
manual
commute
rawData
status
createdAt
updatedAt
```

Use `stravaActivityId` as a unique identifier.

Activity status:
```text
PENDING
VALID
REJECTED
FLAGGED
```

### Score
```text
id
activityId
athleteId
challengeId
points
reason
createdAt
```

## Strava OAuth

Implement:

```text
GET /api/strava/connect
GET /api/strava/callback
```

Flow:
1. Athlete clicks Connect Strava.
2. Redirect to Strava authorization.
3. Exchange authorization code for access token, refresh token, expiry.
4. Associate the returned Strava athlete ID with the correct Sage athlete.
5. Encrypt and store tokens server-side.

Implement token refresh before API requests when the token has expired.

## Strava activities

Create:

```text
GET /api/challenges/:challengeId/sync
```

Admin-only.

For every connected athlete:
1. Refresh token if needed.
2. Fetch `/athlete/activities`.
3. Restrict activities to challenge start/end timestamps.
4. Save/update activities.
5. Validate them.
6. Calculate scores.
7. Update leaderboard.

For MVP, use an admin `SYNC STRAVA` button. Do not continuously poll.

## Activity mapping

Support:
```text
RUN
CYCLING
SWIMMING
WALKING
STRENGTH
OTHER
```

Example mappings:
```text
Run → RUN
TrailRun → RUN
VirtualRun → RUN
Ride → CYCLING
VirtualRide → CYCLING
Swim → SWIMMING
Walk → WALKING
WeightTraining → STRENGTH
Workout → OTHER
```

Do not assume every Strava sport type is eligible.

Initially flag/reject manual activities according to Sage's rules. Flag commutes for review rather than automatically rejecting them.

## Scoring engine

Create:

```text
scoringEngine.ts
calculatePoints(activity, athlete, challenge)
```

Do NOT hard-code scoring in the UI.

The scoring configuration must support different point values by fitness level.

Example:
```text
BEGINNER: running 5km → 10 points
INTERMEDIATE: running 5km → 8 points
ADVANCED: running 5km → 6 points
ELITE: running 5km → 5 points
```

The exact scoring table will be supplied separately.

Create a configuration structure such as:

```json
{
  "running": {
    "beginner": {},
    "intermediate": {},
    "advanced": {},
    "elite": {}
  },
  "cycling": {},
  "swimming": {},
  "strength": {}
}
```

## Daily workout rule

Make this configurable.

Initial rule:
```text
maximum qualifying workouts per athlete per day = 1
```

If an athlete completes multiple qualifying workouts on the same day, count only the highest-scoring one.

Do not allow unlimited activity farming.

## Leaderboard

Create:

```text
GET /api/challenges/:challengeId/leaderboard
```

Return:
```json
[
  {
    "rank": 1,
    "athlete": "Debansh",
    "fitnessLevel": "ADVANCED",
    "points": 42,
    "workouts": 5
  }
]
```

Sort by:
1. Total points descending.
2. Number of qualifying days.
3. Earlier achievement of total points.

Make tie-breakers configurable.

## Admin dashboard

Route:
```text
/admin/challenges/:id
```

Show:
- Challenge name/status.
- Participant count.
- Days remaining.
- Activity count.
- Valid/flagged/rejected activity counts.
- Live leaderboard.

Activity review table:
```text
Athlete
Activity
Sport
Distance
Time
Date
Status
Points
```

Actions:
```text
Approve
Reject
Flag
Recalculate
```

## Athlete dashboard

Route:
```text
/challenge/:id
```

Show:
- Current rank.
- Total points.
- Qualifying days.
- Personal activities and points.
- Full leaderboard.

Do not expose private data such as email.

## Auditability

Every score must be explainable:

```text
Activity
→ Validation
→ Scoring rule
→ Points
→ Leaderboard
```

Example:
```text
Rishant
5.2 km Run
Intermediate
Base points: 8
Qualifying: YES
Daily limit: YES
Final points: 8
```

Store the scoring reason with each score.

## Rate limiting and API client

Create a central:

```text
stravaClient.ts
```

Never scatter raw Strava HTTP requests across the application.

Implement:
- Rate-limit handling.
- Retry with backoff.
- 401 → refresh token.
- 429 → wait/retry.
- 500/503 → retry.

Avoid unnecessary API calls.

## Security

Never put these in React/frontend:
```text
STRAVA_CLIENT_SECRET
refresh_token
```

Architecture:
```text
Browser
  ↓
Sage Backend
  ↓
Strava
```

Encrypt refresh/access tokens at rest.

## Seed current athletes

Create a CSV import/seed script:

```csv
name,email,fitnessLevel,primarySport
Abhay,...,INTERMEDIATE,TRIATHLON
Debansh,...,ADVANCED,TRIATHLON
...
```

Create Sage athletes first, then match them to the Strava athlete returned during OAuth.

Prevent a Strava account from being linked to the wrong Sage athlete.

## MVP pages

Build only:
```text
/login
/connect-strava
/admin
/admin/challenges/:id
/challenge/:id
/challenge/:id/leaderboard
```

Do NOT build yet:
- Payments
- Subscriptions
- Mobile apps
- Social feed
- Chat
- Sponsor management
- Complex profiles
- Notifications

## Tests

Test OAuth:
- Authorization
- Callback
- Token refresh
- Invalid token
- Revoked access

Test activities:
- Duplicate activity
- Manual activity
- Activity outside challenge
- Activity inside challenge
- Multiple activities on same day

Test scoring:
- Beginner
- Intermediate
- Advanced
- Elite

Test leaderboard:
- Ties
- Different scores
- Rejected activity
- Recalculation

## Deployment

Suggested MVP:
```text
Frontend → Vercel
Backend → Railway / Render / AWS
Database → PostgreSQL
```

Use HTTPS in production and configure the Strava callback domain correctly.

## Deliverables

Create:
```text
sage-strava-dashboard/
├── frontend/
├── backend/
├── prisma/
├── tests/
├── .env.example
├── README.md
└── docker-compose.yml
```

README must explain:
1. Local setup.
2. Database setup.
3. Strava application configuration.
4. OAuth flow.
5. Environment variables.
6. Running frontend/backend.
7. Tests.
8. Creating a challenge.
9. Syncing activities.
10. Changing scoring rules.

## Acceptance criteria

The MVP is complete when:
1. Admin can create Sage Challenge #1.
2. Admin can add the 14 athletes.
3. Athlete can click Connect Strava.
4. Athlete authorizes Sage.
5. Sage securely stores the connection.
6. Admin can click Sync Strava.
7. Qualifying activities are retrieved.
8. Activities appear in the admin dashboard.
9. Points are calculated.
10. Leaderboard updates.
11. Admin can approve/reject activities.
12. Scores can be recalculated.
13. Athlete can see their activities, points, and rank.

## Architecture principle

Keep the scoring engine independent from Strava.

Strava is a data provider only. The competition engine should eventually support Garmin, Apple Health, Polar, and other providers without rewriting Sage's scoring/leaderboard logic.

## Build order

1. Project structure.
2. PostgreSQL + Prisma schema.
3. Athlete/challenge CRUD.
4. Strava OAuth.
5. Secure token storage.
6. Strava API client.
7. Activity synchronization.
8. Activity validation.
9. Configurable scoring engine.
10. Leaderboard API.
11. Admin dashboard.
12. Athlete dashboard.
13. Activity approval/rejection.
14. Tests.
15. README.
16. Deployment configuration.

Keep the app runnable and tests passing after each major stage.
