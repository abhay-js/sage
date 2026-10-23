# SAGE App — Product & Implementation Specification

## 1. Purpose

SAGE is a gamified fitness challenge platform designed to make everyday training more engaging, competitive, and social.

Athletes should be able to:

- create a profile
- connect workout data
- receive a Sage athlete level
- discover challenges
- understand challenge eligibility
- join eligible challenges
- earn points from workouts
- see rankings
- compare themselves with nearby athletes
- visually climb the Sage Mountain leaderboard
- view rewards, bonuses, rules, and progress

Admins should be able to:

- review athletes
- inspect recent workout history
- assign or override athlete levels
- configure challenge eligibility
- create and edit challenges
- configure scoring
- configure bonuses
- configure rewards
- review challenge participants

The app should feel like a modern fitness product first, with selective game-like elements layered on top. The main gamified experience is the **Mountain Leaderboard**.

---

## 2. Product Principles

### 2.1 Core idea

> The workout happens in the real world. The workout changes your position in the Sage world.

### 2.2 Visual balance

- 80% clean fitness/product UI
- 20% playful game-like UI
- Mountain Leaderboard is the main game-like surface
- Admin screens should be functional and data-focused

### 2.3 Main motivation loops

Athletes should quickly understand:

- current rank
- current points
- who is immediately ahead
- who is immediately behind
- points required to pass the next athlete
- how many athletes were passed after a workout
- how close they are to a reward, zone, or podium
- which activities and bonuses contributed to their score

---

## 3. Implementation Rules for Codex

Before implementing any screen or feature:

1. Inspect the existing project.
2. Reuse existing components, theme, typography, spacing, navigation, API clients, models, auth, challenge components, and leaderboard components.
3. Do not duplicate screens that already exist.
4. If a screen partially exists, extend or refactor it.
5. Keep changes modular and reviewable.
6. Keep UI consistent with the existing SAGE design.
7. If APIs are unavailable, use mock data behind a typed service/repository layer.
8. Mark temporary mock data with `TODO`.
9. Do not hardcode challenge scoring, rules, bonuses, rewards, or eligibility directly into UI components.
10. Prefer configuration-driven components.
11. Keep the scoring engine independent of UI.
12. Keep raw workout data separate from challenge scoring data.

---

## 4. Roles

```ts
type UserRole = "ATHLETE" | "ADMIN";
```

All admin routes and APIs must be protected server-side, not only hidden in UI.

---

## 5. Athlete Navigation

Recommended bottom navigation:

```text
Home | Challenges | Mountain | Activity | Profile
```

Behavior:

- `Home` shows active challenge, quick progress, and workout sync.
- `Challenges` shows live, upcoming, and completed challenges.
- `Mountain` opens the active challenge leaderboard.
- `Activity` shows synced workouts and challenge scoring.
- `Profile` shows athlete identity, sports, goals, level, and stats.

If no active challenge exists, Mountain should show an empty state with a CTA to browse challenges.

---

# AUTHENTICATION

## 6. Welcome Screen

Purpose: introduce Sage and let the athlete authenticate.

Components:

- SAGE logo
- short tagline
- Continue with Google
- Sign in with Email
- Create Account

Suggested tagline:

> Train. Compete. Rise.

Optional secondary text:

> Make the days between races count.

---

## 7. Sign Up

Support:

### Google

```text
Continue with Google
```

### Email

Fields:

- Email
- Password
- Confirm Password

Validation:

- valid email
- minimum password length
- password confirmation matches
- clear inline errors

Future:

- Sign in with Apple

---

## 8. Sign In

Fields:

- Email
- Password

Actions:

- Sign In
- Forgot Password
- Continue with Google
- Create Account

---

## 9. Authentication Routing

```ts
if (!user.isAuthenticated) {
  return "AUTH";
}

if (!athleteProfile.onboardingCompleted) {
  return "ONBOARDING";
}

return "APP";
```

---

# ATHLETE ONBOARDING

## 10. Onboarding Flow

Use a short multi-step flow rather than one long form.

Recommended steps:

```text
1. About You
2. Your Sports
3. Events & Goals
4. Training Profile
5. Connect Workouts
```

Show progress such as:

```text
Step 2 of 5
```

Do not ask for detailed PB history or too many optional fields during initial onboarding. Those can be added later from Edit Profile.

---

## 11. Step 1 — About You

Fields:

- Profile photo
- Full name
- Gender
- Date of birth
- City
- Country

Gender options:

- Male
- Female
- Other
- Prefer not to say

Prefer storing date of birth rather than age.

Example:

```ts
interface AthleteProfile {
  id: string;
  userId: string;
  fullName: string;
  profileImageUrl?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  dateOfBirth?: string;
  city?: string;
  country?: string;
  onboardingCompleted: boolean;
}
```

---

## 12. Step 2 — Sports

Question:

> What sports do you train for?

Allow multiple selections:

- Running
- Cycling
- Swimming
- Triathlon
- HYROX
- Strength
- Other

Use selectable icon cards.

Then ask:

> What is your primary sport?

Only one selection.

```ts
type SportType =
  | "RUN"
  | "RIDE"
  | "SWIM"
  | "TRIATHLON"
  | "HYROX"
  | "STRENGTH"
  | "OTHER";
```

Store:

```ts
primarySport: SportType;
sports: SportType[];
```

---

## 13. Step 3 — Events & Goals

Question:

> What types of events do you participate in or train for?

Allow multiple selections.

### Running

- 5K
- 10K
- Half Marathon
- Marathon
- Ultra Marathon

### Triathlon

- Sprint Triathlon
- Olympic Distance
- Ironman 70.3
- Full Ironman

### Cycling

- Gran Fondo
- Cycling Race
- Brevet
- Recreational / Endurance Cycling

### HYROX

- HYROX Singles
- HYROX Doubles
- HYROX Relay

### Swimming

- Pool Swimming
- Open Water Swimming

### Other

- Other
- No event currently

Optional upcoming goal:

- Event Name
- Event Date
- Target / Goal

Example:

```text
Ironman Goa 2026
Target: Sub 6 hours
```

Event type is useful context but should not determine athlete level by itself.

---

## 14. Step 4 — Training Profile

Ask about normal current training.

### Weekly sessions

Question:

> How many training sessions do you normally do per week?

Options:

- 1–2
- 3–4
- 5–6
- 7–9
- 10+

### Weekly training hours

Question:

> Approximately how many hours do you train per week?

Options:

- Under 3 hours
- 3–5 hours
- 5–8 hours
- 8–12 hours
- 12+ hours

### Running volume

Only show if Running or Triathlon is selected.

- Under 10 km/week
- 10–20 km/week
- 20–40 km/week
- 40–60 km/week
- 60+ km/week

### Cycling volume

Only show if Cycling or Triathlon is selected.

- Under 50 km/week
- 50–100 km/week
- 100–200 km/week
- 200–300 km/week
- 300+ km/week

### Swimming volume

Only show if Swimming or Triathlon is selected.

- Under 2 km/week
- 2–5 km/week
- 5–10 km/week
- 10+ km/week

### Strength / HYROX frequency

Only show if relevant.

- 0 sessions/week
- 1 session/week
- 2 sessions/week
- 3 sessions/week
- 4+ sessions/week

Do not ask irrelevant sport questions.

---

## 15. Step 5 — Workout Connection

Primary iOS option:

```text
Connect Apple Health
```

Description:

> Sync your recent workouts so Sage can understand your training and score your challenge activities.

Also allow:

```text
Do this later
```

Future sources:

- Garmin
- Health Connect
- FIT upload
- other approved integrations

Do not make Strava a required dependency.

---

# ATHLETE LEVEL SYSTEM

## 16. Levels

Initial supported levels:

- Level 1
- Level 2
- Unassigned / Under Review

```ts
type AthleteLevel =
  | "LEVEL_1"
  | "LEVEL_2"
  | "UNASSIGNED";
```

### Level 1

More experienced / higher-volume / more consistent athlete.

### Level 2

Developing or lower-volume athlete.

### Unassigned

Athlete has not yet been reviewed.

Do not hardcode UI assumptions that Sage will always have exactly two levels. Components should be data-driven so more levels can be added later.

---

## 17. Initial Level Assignment Strategy

MVP flow:

```text
Athlete completes onboarding
↓
Sage stores declared training profile
↓
Sage reads available workout history
↓
Backend calculates useful metrics
↓
Backend may suggest a level
↓
Admin reviews athlete
↓
Admin assigns final level
```

Do not make the suggested level final yet.

---

## 18. Suggested Level Inputs

Backend may use:

- recent workout count
- workouts/week
- active weeks
- weekly training time
- running volume
- cycling volume
- swimming volume
- strength frequency
- longest run
- longest ride
- longest swim
- consistency
- recent sport mix
- event experience
- declared training profile

```ts
interface SuggestedLevelResult {
  suggestedLevel: AthleteLevel;
  confidence?: number;
  reasons: string[];
}
```

Example:

```json
{
  "suggestedLevel": "LEVEL_1",
  "confidence": 0.84,
  "reasons": [
    "Average 5.2 workouts per week",
    "Average 145 km cycling per week",
    "Consistent activity across recent weeks",
    "Multiple long endurance sessions"
  ]
}
```

---

## 19. Athlete Level State

```ts
interface AthleteLevelState {
  level: AthleteLevel;
  suggestedLevel?: AthleteLevel;
  status:
    | "PENDING_REVIEW"
    | "APPROVED"
    | "ADMIN_OVERRIDE";
  updatedAt?: string;
  updatedBy?: string;
}
```

Default:

```ts
level = "UNASSIGNED";
status = "PENDING_REVIEW";
```

Athlete-facing UI should show:

```text
Your Sage Level
Under Review
```

or:

```text
Your Sage Level
LEVEL 1
```

---

## 20. Level History

Never overwrite level without history.

```ts
interface AthleteLevelHistory {
  id: string;
  athleteId: string;
  previousLevel?: AthleteLevel;
  newLevel: AthleteLevel;
  reason?: string;
  assignedBy: string;
  assignedAt: string;
}
```

---

# HOME

## 21. Home Screen

Keep Home intentionally simple.

### Header

Example:

```text
Good morning, Abhay
```

Show:

- greeting
- avatar
- notification affordance if needed

### Active Challenge Card

Show:

- challenge name
- live/upcoming state
- day number
- days remaining
- rank
- points
- next rival point gap
- compact mountain progress
- CTA

Example:

```text
SAGE CLASH #4
LIVE · Day 3 of 7

Rank #24
195 pts

8 pts to #23

[ View Mountain ]
```

### Workout Sync Card

```text
Apple Health

Sync your latest workouts to update your challenge score.

[ Sync Workouts ]
```

### Today Summary

```text
TODAY
4.2 km

STREAK
5 Days
```

### No Active Challenge

```text
No active challenge

Find your next Sage Clash and start climbing.

[ Browse Challenges ]
```

---

# CHALLENGES

## 22. Challenge List Screen

Screen title:

```text
Challenges
```

Sections:

- Live
- Upcoming
- Completed

Optional filters:

- All
- Running
- Cycling
- Triathlon
- HYROX
- Strength

---

## 23. Challenge Card

Each card should show:

- challenge name
- cover image / simple illustration
- challenge type
- dates
- duration
- participant count
- eligible level(s)
- athlete eligibility
- small reward preview
- status
- CTA

Example:

```text
SAGE CLASH #4

7-Day Endurance Clash
12–18 Oct
184 athletes

LEVEL 1
✓ You're eligible

1st Prize: DRFT Trisuit

[ View Challenge ]
```

Eligibility states:

### Eligible

```text
✓ Eligible
```

### Not Eligible

```text
Level 1 required
```

### Pending

```text
Your level is under review
```

### Joined

```text
Joined · Rank #24
```

---

## 24. Challenge Model

```ts
interface Challenge {
  id: string;
  name: string;
  description?: string;
  challengeType?: string;
  coverImageUrl?: string;
  startDate: string;
  endDate: string;
  status:
    | "DRAFT"
    | "UPCOMING"
    | "LIVE"
    | "COMPLETED"
    | "CANCELLED";
  eligibleLevels: AthleteLevel[];
  sports: SportType[];
  maxWorkoutsPerDay?: number;
  participantCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 25. Challenge Eligibility

Eligibility is derived from:

```text
Athlete Level + Challenge Eligible Levels = Eligibility
```

```ts
const isEligible = challenge.eligibleLevels.includes(athlete.level);
```

If level is unassigned:

```ts
eligibilityStatus = "PENDING_LEVEL_REVIEW";
```

```ts
type ChallengeEligibilityStatus =
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "PENDING_LEVEL_REVIEW";
```

---

## 26. Challenge Details Screen

This should feel like an event page, not an Instagram poster.

Hero/header example:

```text
SAGE CLASH #4
7-Day Endurance Clash

LIVE
12–18 October
184 athletes
```

Show eligibility clearly:

```text
Challenge Level
LEVEL 1

Your Level
LEVEL 1

✓ You're eligible
```

Not eligible:

```text
Challenge Level
LEVEL 1

Your Level
LEVEL 2

Not eligible for this Clash
```

Pending:

```text
Your Level
Under Review

Eligibility will be confirmed after level review.
```

Recommended sections or tabs:

- Overview
- Points
- Bonuses
- Rewards
- Rules
- Athletes

---

## 27. Challenge Overview

Show:

- description
- start date
- end date
- duration
- days remaining
- participant count
- supported sports
- eligible levels

If joined:

```text
Your Rank
#24

Your Points
195

8 pts to #23

[ View Mountain ]
```

If eligible but not joined:

```text
[ Join Challenge ]
```

If not eligible:

```text
Not Eligible
[ View Other Challenges ]
```

---

## 28. Challenge Scoring

Scoring must be configuration-driven.

```ts
interface ChallengeScoringRule {
  id: string;
  challengeId: string;
  sport: SportType;
  threshold: number;
  unit: "KM" | "MINUTES" | "METERS" | "SESSION";
  points: number;
  order?: number;
}
```

Example UI:

### Running

```text
3 km   — 5 pts
5 km   — 10 pts
10 km  — 25 pts
15 km  — 40 pts
20 km  — 55 pts
```

### Cycling

```text
10 km   — 5 pts
20 km   — 10 pts
40 km   — 25 pts
60 km   — 40 pts
100 km  — 65 pts
```

### Strength

```text
30 min  — 5 pts
45 min  — 10 pts
60 min  — 15 pts
90 min  — 25 pts
```

Every challenge may have different scoring.

---

## 29. Bonus Missions

```ts
type ChallengeBonusType =
  | "EARLY_BIRD"
  | "STREAK"
  | "OUTDOOR"
  | "BRICK"
  | "ELEVATION"
  | "CUSTOM";

interface ChallengeBonus {
  id: string;
  challengeId: string;
  type: ChallengeBonusType;
  title: string;
  description: string;
  points: number;
  maxUses?: number;
  metadata?: Record<string, unknown>;
}
```

Examples:

```text
Early Bird
+5 pts
Complete an eligible workout before 7 AM.
```

```text
Streak
3 consecutive days +10 pts
5 consecutive days +20 pts
```

```text
Outdoor Ride
+3 pts
```

```text
Brick Bonus
+5 pts
```

---

## 30. Challenge Rules

Rules should also be backend-configurable.

```ts
interface ChallengeRule {
  id: string;
  challengeId: string;
  title: string;
  description: string;
  order: number;
}
```

Show concise summaries first:

```text
7-day challenge
Maximum 2 counted workouts per day
Workout verification required
Be honest. Be fair.
```

CTA:

```text
View All Rules
```

---

## 31. Rewards Preview

Challenge Details should show a compact reward preview.

Example:

```text
REWARDS

🥇 DRFT Performance Trisuit
🥈 DRFT Cycling Jersey
🥉 Urban Company Cupping Therapy

[ View Rewards ]
```

Use real product imagery where available.

---

## 32. Rewards Screen

This screen can be more visual than Challenge Details.

Header:

```text
CLASH #4 REWARDS
Train. Compete. Rise.
```

Layout:

- large 1st prize card
- smaller 2nd prize card
- smaller 3rd prize card

Example:

```text
🥇 1ST PLACE
DRFT Performance Trisuit

🥈 2ND PLACE
DRFT Cycling Jersey

🥉 3RD PLACE
Urban Company Cupping Therapy
```

Show athlete context:

```text
Your Rank
#24

Your Points
195 pts

88 pts from podium
```

```ts
interface ChallengeReward {
  id: string;
  challengeId: string;
  rank: number;
  title: string;
  description?: string;
  imageUrl?: string;
  sponsor?: string;
  terms?: string;
}
```

---

## 33. Join Challenge Flow

When athlete taps Join:

1. verify challenge status
2. verify athlete level
3. verify eligibility
4. show confirmation
5. create ChallengeParticipant

Example:

```text
Join SAGE CLASH #4?

7 Days
Running · Cycling · Strength
Level 1

[ Cancel ] [ Join Challenge ]
```

---

## 34. Challenge Participant Model

```ts
interface ChallengeParticipant {
  id: string;
  challengeId: string;
  athleteId: string;
  levelAtJoin: AthleteLevel;
  joinedAt: string;
  totalPoints: number;
  rank?: number;
  status:
    | "ACTIVE"
    | "COMPLETED"
    | "DISQUALIFIED"
    | "WITHDRAWN";
}
```

Important: store `levelAtJoin`.

If the admin changes the athlete's current level later, historical challenge participation should not unexpectedly change.

---

# MOUNTAIN LEADERBOARD

## 35. Core Concept

The Mountain is Sage's signature gamified screen.

The mountain itself is the leaderboard.

Do not design a normal leaderboard with a mountain image behind it.

Use:

- one continuous mountain / cliff
- vertical scrolling
- close camera
- simple 2D climbing characters
- sky and minimal scenery
- Sage orange highlight for the current athlete

Avoid:

- showing the whole mountain by default
- hundreds of full athlete labels
- winding roads
- unrelated landscape sections
- realistic 3D graphics

---

## 36. Default Mountain Camera

Open centered around the current athlete.

Show approximately:

- 2–4 athletes above
- current athlete
- 2–4 athletes below

Example:

```text
Amit
#22 · 203 pts

+8 pts

YOU
#23 · 195 pts

-7 pts

Dhruva
#24 · 188 pts
```

---

## 37. Athlete Character

Each athlete has a simple climber character.

Possible differences:

- shirt color
- tiny avatar/head
- gear color
- idle climbing animation

Current user is highlighted in Sage orange.

Characters should be implementable with:

- Rive
- Lottie
- sprite animation
- React Native Reanimated

---

## 38. Mountain Position

Position is derived from challenge score.

Conceptually:

```ts
positionPercent = athlete.totalPoints / leader.totalPoints;
```

Implementation should normalize spacing so huge score gaps do not create unusable empty areas.

Use minimum and maximum visual spacing between nearby athletes.

---

## 39. Mountain Scroll

Support:

- scroll upward to athletes ahead
- scroll downward to athletes behind
- `Back to Me`

Button:

```text
◎ Back to Me
```

Optional:

- mini progress indicator
- summit marker
- current rank zone

---

## 40. Scaling to 500+ Athletes

Do not render every athlete at full detail.

Use virtualization.

Render:

- visible athletes
- small buffer above/below viewport

For zoomed-out views use:

- dots
- clusters
- rank zones

Example:

```text
42 athletes
Ranks 101–142
```

Default experience should remain focused around the user.

---

## 41. Summit Experience

At the top of the mountain:

- #1 center/highest
- #2 slightly lower
- #3 slightly lower

Top three can sit or stand on simple summit chairs/platforms.

Show:

- avatar / character
- athlete name
- rank
- points
- Sage summit flag

Avoid a generic Olympic podium if possible.

---

## 42. Mountain / List Toggle

Header:

```text
[ Mountain ] [ List ]
```

Mountain = emotional / visual / gamified.

List = precise / searchable / data-focused.

---

## 43. Leaderboard List View

Each row:

- rank
- avatar
- athlete name
- athlete level
- points
- rank movement

Example:

```text
1   Aritra    L1    512 pts
2   Tushar    L1    498 pts
3   Dhruva    L2    476 pts
23  You       L1    195 pts
```

Highlight current athlete.

---

# WORKOUTS AND SCORING

## 44. Workout Model

```ts
interface Workout {
  id: string;
  athleteId: string;
  sport:
    | "RUN"
    | "RIDE"
    | "SWIM"
    | "STRENGTH"
    | "HYROX"
    | "OTHER";
  source:
    | "APPLE_HEALTH"
    | "GARMIN"
    | "HEALTH_CONNECT"
    | "MANUAL"
    | "FIT_UPLOAD";
  startTime: string;
  durationSeconds: number;
  distanceMeters?: number;
  elevationMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPower?: number;
  indoor?: boolean;
  verificationStatus:
    | "VERIFIED"
    | "PENDING"
    | "REJECTED";
  sourceWorkoutId?: string;
  createdAt: string;
}
```

---

## 45. Workout Sync Flow

MVP flow:

```text
Open Sage
→ Sync Apple Health
→ detect new workouts
→ deduplicate
→ import
→ find active challenge
→ validate workout
→ calculate base points
→ calculate bonuses
→ update challenge total
→ update rank
→ show Workout Result
→ show Mountain movement
```

---

## 46. Deduplication

Recommended unique identity:

```text
athleteId + source + sourceWorkoutId
```

Fallback:

```text
athleteId + sport + startTime + duration + distance
```

Never import the same workout twice.

---

## 47. Challenge Activity Model

Keep raw workout separate from challenge scoring.

```ts
interface ChallengeActivity {
  id: string;
  challengeId: string;
  athleteId: string;
  workoutId: string;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  status:
    | "COUNTED"
    | "REJECTED"
    | "PENDING";
  createdAt: string;
}
```

```ts
interface ChallengeActivityBonus {
  id: string;
  challengeActivityId: string;
  bonusId?: string;
  type: ChallengeBonusType;
  label: string;
  points: number;
}
```

---

## 48. Workout Result Screen

After successful scoring:

```text
WORKOUT SYNCED

42 km Ride

+38 pts
```

Show:

```text
Previous Rank
#24

New Rank
#18
```

Then:

```text
🔥 You passed 6 athletes
Only 8 pts to Amit.
```

CTA:

```text
[ See Your Climb ]
```

Also allow point breakdown:

```text
Ride              +30
Outdoor Bonus      +3
Elevation          +5
----------------------
Total              +38
```

---

## 49. Mountain Movement Animation

After workout result:

- open Mountain
- begin at previous score position
- animate current athlete upward
- pass relevant nearby athletes
- show small pass feedback
- stop at new score position

Example:

```text
🔥 Passed Rahul
🔥 Passed Dhruva
```

Final:

```text
You passed 6 athletes
#24 → #18
8 pts to your next rival
```

Only animate current athlete and relevant nearby athletes.

---

## 50. Verification

```ts
type WorkoutVerificationStatus =
  | "VERIFIED"
  | "PENDING"
  | "REJECTED";
```

Only valid activities should score.

```ts
if (workout.verificationStatus !== "VERIFIED") {
  return noScore;
}
```

---

# ATHLETE PROFILE

## 51. Profile Screen

Show:

- profile photo
- full name
- Sage Level
- city
- country
- primary sport
- selected sports
- event types
- upcoming goal
- challenges completed
- wins / podiums
- current streak

Example:

```text
Abhay Jain
LEVEL 1
Triathlon · Running · Cycling
Bengaluru, India
```

---

## 52. Training Summary

Profile may show lightweight totals:

- workouts
- running distance
- cycling distance
- swimming distance
- strength sessions
- training time

Do not overload Profile with advanced analytics.

---

## 53. Edit Profile

Athlete can edit:

- profile image
- full name
- city
- country
- sports
- primary sport
- event types
- upcoming goal

Athlete must not directly edit Sage Level.

---

# ACTIVITY

## 54. Activity Screen

Show workout history.

Each row:

- sport
- date/time
- distance
- duration
- elevation
- source
- verification status
- challenge points if applicable

Example:

```text
Ride
42 km
1h 48m
+38 challenge pts
Apple Health
Verified
```

---

# ADMIN EXPERIENCE

## 55. Admin Navigation

Recommended sections:

- Overview
- Athletes
- Challenges
- Activities
- Settings

Admin may be a separate web dashboard or protected app section.

---

## 56. Admin Athlete List

Title:

```text
Athletes
```

Top summary:

```text
428 athletes
```

Search:

```text
Search athlete
```

Filters:

- All
- Level 1
- Level 2
- Under Review

Optional filters:

- Primary Sport
- Recently Active
- Challenge Participant

---

## 57. Admin Athlete Row

Show:

- avatar
- name
- current level
- primary sport
- recent workout count
- last activity
- review status

Example:

```text
Aritra Roy
LEVEL 1
Triathlon
90 recent workouts
Last active: Today
```

Under review example:

```text
Rahul Sharma
UNDER REVIEW
Running
41 recent workouts
[ Review ]
```

---

## 58. Admin Athlete Detail

Header:

```text
Aritra Roy
Current Level: LEVEL 1
```

Actions:

```text
[ Change Level ]
```

Sections:

- profile summary
- declared training profile
- events/goals
- recent training analytics
- suggested level
- level history

---

## 59. Last 90 Workouts Review

Use latest **90 workout records** unless product later changes this to last 90 calendar days.

Title:

```text
LAST 90 WORKOUTS
```

Summary metrics:

- workout count
- date range covered
- total training time
- active weeks
- average workouts/week
- average duration/session

Example:

```text
90 workouts
12 weeks covered
7h 40m / week
5.4 workouts / week
```

---

## 60. Running Analytics

If athlete runs, show:

- number of runs
- total distance
- weekly average distance
- longest run
- average run duration
- average pace if reliable

---

## 61. Cycling Analytics

Show:

- number of rides
- total distance
- weekly average distance
- longest ride
- indoor/outdoor split
- total elevation if available
- average duration

---

## 62. Swimming Analytics

Show:

- number of swims
- total distance
- weekly average distance
- longest swim
- average duration

---

## 63. Strength / HYROX Analytics

Show:

- number of sessions
- total duration
- weekly average sessions
- longest session

---

## 64. Admin Charts

Keep analytics simple.

Recommended:

### Weekly Training Volume

Simple chart across recent weeks.

### Workout Distribution

Example:

```text
Running   35%
Cycling   42%
Swimming  14%
Strength   9%
```

### Consistency

Example:

```text
Active in 11 of last 12 weeks
```

Admin should understand an athlete in 10–15 seconds.

---

## 65. Suggested Level Card

Example:

```text
SAGE SUGGESTION
LEVEL 1

• 5.4 workouts/week
• 142 km cycling/week
• Active across 11/12 weeks
• Multiple long endurance sessions

Suggestion only — admin approval required
```

---

## 66. Admin Level Assignment

Card:

```text
ATHLETE LEVEL

Current
LEVEL 2

Suggested
LEVEL 1
```

Control:

```text
Assign Level
( ) Level 1
( ) Level 2
```

Optional:

```text
Admin Note
```

CTA:

```text
[ Save Level ]
```

Confirmation:

```text
Change athlete level?

Aritra Roy
Level 2 → Level 1

[ Cancel ] [ Confirm ]
```

After saving:

- create level history record
- update athlete current level
- record admin ID
- record timestamp

---

# ADMIN CHALLENGE MANAGEMENT

## 67. Admin Challenge List

Show:

- name
- status
- dates
- eligible levels
- participant count
- challenge type

Actions:

- Create Challenge
- Edit
- Duplicate
- View Participants
- Close Challenge

---

## 68. Challenge Creation Flow

Recommended sections:

1. Basic Information
2. Eligibility
3. Sports
4. Scoring
5. Bonuses
6. Rules
7. Rewards
8. Review & Publish

---

## 69. Basic Information

Fields:

- Challenge Name
- Description
- Cover Image
- Start Date
- End Date
- Challenge Type

Example:

```text
SAGE CLASH #4
7-Day Cycling Clash
```

---

## 70. Challenge Eligibility Configuration

Section:

```text
WHO CAN PARTICIPATE?
```

Checkboxes:

```text
[ ] Level 1
[ ] Level 2
```

Allow:

- Level 1 only
- Level 2 only
- both

Future filters may include club, invitation, age group, etc., but do not build them unless required.

---

## 71. Challenge Sports

Checkboxes:

```text
[ ] Running
[ ] Cycling
[ ] Swimming
[ ] Strength
[ ] HYROX
```

Only selected sports appear in athlete-facing scoring.

---

## 72. Scoring Editor

Admin can add/remove scoring rows.

Example:

```text
Cycling

10 km   5 pts
20 km  10 pts
40 km  25 pts
60 km  40 pts
100 km 65 pts

[ + Add Row ]
```

Allow:

- threshold
- unit
- points
- ordering

---

## 73. Bonus Editor

Example:

```text
Early Bird
Points: 5
Condition: workout starts before 7:00 AM
Max Uses: 2
```

Another:

```text
Outdoor Ride
Points: 3
Condition: eligible outdoor cycling workout
```

---

## 74. Rules Editor

Fields:

- title
- description
- order

Example:

```text
Maximum 2 workouts/day
Only the first 2 eligible workouts are counted.
```

---

## 75. Rewards Editor

For each reward:

- rank
- prize name
- description
- image
- sponsor
- terms

Example:

```text
Rank: 1
Prize: DRFT Performance Trisuit
Sponsor: DRFT
```

---

## 76. Admin Challenge Participants

Summary:

```text
184 Participants

Eligible       161
Not Eligible    17
Under Review     6
```

Rows:

```text
Aritra Roy
Level 1
✓ Eligible
```

```text
Dhruva J
Level 2
Not Eligible
```

```text
Rahul Sharma
Unassigned
Review
```

Clicking `Review` should open Athlete Detail and level review.

---

## 77. Important Eligibility Rule

Evaluate eligibility when the athlete attempts to join.

After joining, preserve:

```text
levelAtJoin
```

If admin later changes current level, do not automatically rewrite historical challenge participation.

For active challenge eligibility changes, require explicit admin action if removal/disqualification is needed.

---

# BACKEND / DATA MODEL

## 78. User

```ts
interface User {
  id: string;
  email: string;
  role: UserRole;
  authProvider: "EMAIL" | "GOOGLE" | "APPLE";
  createdAt: string;
  updatedAt: string;
}
```

---

## 79. Expanded Athlete

```ts
interface Athlete {
  id: string;
  userId: string;
  fullName: string;
  profileImageUrl?: string;
  gender?: string;
  dateOfBirth?: string;
  city?: string;
  country?: string;
  primarySport?: SportType;
  sports: SportType[];
  events: string[];
  weeklySessionRange?: string;
  weeklyTrainingHoursRange?: string;
  runningWeeklyVolumeRange?: string;
  cyclingWeeklyVolumeRange?: string;
  swimmingWeeklyVolumeRange?: string;
  strengthWeeklySessionRange?: string;
  level: AthleteLevel;
  suggestedLevel?: AthleteLevel;
  levelStatus:
    | "PENDING_REVIEW"
    | "APPROVED"
    | "ADMIN_OVERRIDE";
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 80. Core Entities

Minimum backend entities:

```text
User
Athlete
AthleteLevelHistory
Workout
Challenge
ChallengeParticipant
ChallengeScoringRule
ChallengeBonus
ChallengeRule
ChallengeReward
ChallengeActivity
ChallengeActivityBonus
```

---

## 81. Data Separation

Keep these concepts separate:

### Raw Workout

What the athlete actually did.

### Challenge Activity

How that workout was interpreted for a specific challenge.

### Athlete Level

Current Sage classification.

### Level At Join

Historical classification when entering a challenge.

### Challenge Points

Points earned specifically inside that challenge.

Do not combine these into one record.

---

## 82. Scoring Engine Flow

```text
Workout imported
↓
Validate workout
↓
Find active challenges for athlete
↓
Check workout time/date
↓
Check supported sport
↓
Check daily cap
↓
Calculate base points
↓
Calculate bonuses
↓
Create ChallengeActivity
↓
Update participant total
↓
Recalculate ranking
```

---

## 83. Scoring Auditability

Every scored workout must be explainable.

Example:

```json
{
  "workoutId": "workout_123",
  "basePoints": 30,
  "bonuses": [
    { "type": "OUTDOOR", "points": 3 },
    { "type": "ELEVATION", "points": 5 }
  ],
  "totalPoints": 38
}
```

---

## 84. Rank Calculation

Source of truth must be backend.

Suggested tie-breaking:

1. total points descending
2. if equal, athlete reaching that score first ranks higher

Do not make client-side ranking authoritative.

---

## 85. Nearby Rival API

The Mountain does not need the entire leaderboard.

Recommended endpoint:

```text
GET /challenges/:id/leaderboard/around-me
```

Response:

```ts
interface LeaderboardAthlete {
  athleteId: string;
  name: string;
  avatarUrl?: string;
  level: AthleteLevel;
  rank: number;
  points: number;
}

interface AroundMeLeaderboard {
  current: LeaderboardAthlete;
  above: LeaderboardAthlete[];
  below: LeaderboardAthlete[];
  leader: LeaderboardAthlete;
  totalAthletes: number;
}
```

---

## 86. Full Leaderboard API

```text
GET /challenges/:id/leaderboard?page=1&limit=50
```

Support:

- pagination
- search
- rank lookup

Do not load 500+ athletes on every screen load if not needed.

---

## 87. Admin Workout Analysis API

Recommended endpoint:

```text
GET /admin/athletes/:athleteId/workout-analysis?limit=90
```

Response should include:

- recent workout list
- summary
- sport breakdown
- weekly consistency
- suggested level
- reasons

Prefer backend aggregation over doing heavy analytics in frontend.

---

# PRIVACY

## 88. Athlete Data Visibility

Athletes should not automatically see another athlete's full private workout details.

Public challenge surfaces may show:

- name
- avatar
- rank
- points
- level
- small recent activity summary if allowed

Admin may have broader visibility for moderation and level review.

---

# UI / DESIGN SYSTEM

## 89. Style

Primary style:

- white/light surfaces
- black / near-black typography
- Sage orange accent
- simple green / blue supporting colors
- rounded cards
- modern sports aesthetic
- clean spacing
- minimal gradients

Avoid:

- fantasy UI
- cluttered dashboards
- excessive colors
- excessive shadows
- poster typography inside app screens
- making every screen look like a game

---

## 90. Semantic Colors

Reuse the existing project theme if present.

Suggested roles:

```ts
primary = SAGE_ORANGE
textPrimary = NEAR_BLACK
textSecondary = GRAY
background = WHITE
surface = OFF_WHITE
success = GREEN
warning = AMBER
error = RED
```

Level colors should remain subtle and data-driven.

---

## 91. Reusable Components

Prefer components such as:

```text
AthleteAvatar
AthleteLevelBadge
ChallengeCard
ChallengeStatusBadge
EligibilityBadge
RewardCard
ScoringTable
BonusCard
RuleRow
WorkoutCard
LeaderboardRow
MountainAthleteMarker
MetricCard
EmptyState
LoadingSkeleton
SectionHeader
```

---

## 92. Suggested Frontend Structure

Adapt to the existing codebase rather than forcing a rewrite.

Example:

```text
src/
  components/
    athlete/
    challenge/
    leaderboard/
    workout/
    admin/
    common/

  screens/
    auth/
    onboarding/
    home/
    challenges/
    leaderboard/
    activity/
    profile/
    admin/

  navigation/
  services/
  hooks/
  store/
  types/
  utils/
  theme/
```

---

# STATES

## 93. Empty States

Examples:

### No Challenges

```text
No challenges available yet.
Your next Clash is coming soon.
```

### No Active Challenge

```text
You're not in an active challenge.
[ Browse Challenges ]
```

### No Workouts

```text
No workouts synced yet.
Connect Apple Health to get started.
```

### No Athlete Search Result

```text
No athletes found.
```

---

## 94. Loading States

Use skeletons for:

- Home
- Challenge cards
- Challenge details
- Leaderboard
- Activity list
- Admin athlete list

Avoid blocking full-screen spinners if partial content can render.

---

## 95. Error States

Example:

```text
Couldn't sync your workouts.
Check your connection and try again.
[ Try Again ]
```

Leaderboard:

```text
Couldn't load leaderboard.
[ Retry ]
```

---

## 96. Offline Behavior

Where practical:

- show cached Home
- show cached Challenge Details
- show cached Leaderboard
- disable workout sync
- show connection status

Example:

```text
You're offline.
Workout sync will be available when you're connected.
```

---

# IMPLEMENTATION PHASES

## 97. Phase 0 — Audit Existing App

Before coding:

- inspect routes
- inspect components
- inspect screens
- inspect models
- inspect state management
- inspect API layer
- inspect mocks
- inspect current Mountain implementation

Output a gap analysis.

---

## 98. Phase 1 — Foundation

Implement or confirm:

- authentication
- route protection
- navigation
- theme
- shared components
- core types

---

## 99. Phase 2 — Athlete Onboarding

Implement:

- About You
- Sports
- Events & Goals
- Training Profile
- Workout Connection
- onboarding completion

---

## 100. Phase 3 — Athlete Profile

Implement:

- Profile
- Edit Profile
- Level badge
- Under Review state

---

## 101. Phase 4 — Challenges

Implement:

- Challenge List
- Challenge Card
- Eligibility states
- Challenge Details
- Points
- Bonuses
- Rules
- Rewards
- Join flow

---

## 102. Phase 5 — Leaderboard

Implement:

- standard leaderboard list
- around-me data model
- Mountain leaderboard
- summit
- Back to Me
- scalable rendering

---

## 103. Phase 6 — Workout Sync

Implement:

- Apple Health integration
- recent workout fetch
- import
- dedupe
- scoring call
- Workout Result
- rank movement
- Mountain movement

---

## 104. Phase 7 — Admin Athlete Review

Implement:

- Athlete List
- filters
- Athlete Detail
- recent 90-workout analysis
- suggested level
- level assignment
- level history

---

## 105. Phase 8 — Admin Challenge Management

Implement:

- challenge editor
- eligibility
- scoring
- bonuses
- rules
- rewards
- participant review

---

# MVP SCOPE

## 106. Athlete MVP

Athlete must be able to:

```text
Sign Up
→ Complete Profile
→ Select Sports
→ Add Training Profile
→ Connect / Skip Apple Health
→ Receive Under Review status
→ Browse Challenges
→ See Challenge Level
→ See Eligibility
→ Join Eligible Challenge
→ Sync Workout
→ Earn Points
→ See Workout Result
→ View Leaderboard
→ View Mountain Position
→ View Rewards
→ View Profile
```

---

## 107. Admin MVP

Admin must be able to:

```text
View Athlete List
→ Open Athlete
→ Review Recent Workouts
→ See Training Summary
→ See Suggested Level
→ Assign Level
→ View Level History
→ Create/Edit Challenge
→ Select Eligible Levels
→ Configure Scoring
→ Configure Bonuses
→ Configure Rules
→ Configure Rewards
→ View Participants
```

---

## 108. Not Required for Initial MVP

Do not block MVP on:

- live GPS workout recording
- live athlete tracking
- real-time multiplayer sockets
- messaging
- teams
- clubs
- virtual inventory
- complex character customization
- automatic final level assignment
- advanced social feed
- Garmin direct integration
- Android Health Connect if iOS is first target
- background sync
- AI coaching

---

# CODEX WORKFLOW

## 109. Required Audit Before Implementation

Codex must first produce:

### Existing

Screens/features already working.

### Partial

Screens/features present but incomplete.

### Missing

Screens/features not present.

For every item include:

- file path
- current status
- reusable components
- missing behavior
- recommended priority

Do not rewrite working screens unnecessarily.

---

## 110. First Codex Prompt

Use this after adding this document to the repo:

```text
Read docs/SAGE_APP_SPEC.md completely.

Inspect the existing codebase and compare it with the specification.

Do not implement anything yet.

First produce a screen-by-screen and data-model gap analysis with these sections:

1. Already implemented
2. Partially implemented
3. Missing
4. Existing components that should be reused
5. Existing models/API contracts that conflict with the spec
6. Recommended implementation order

For every item, include relevant file paths.

Do not rewrite working screens unnecessarily.

After the audit, wait for approval before implementing.
```

---

## 111. Example Feature Prompt

```text
Implement only the Athlete Onboarding flow from docs/SAGE_APP_SPEC.md.

Reuse the existing design system and authentication.
Do not modify Challenge or Mountain screens in this task.

Implement:
- About You
- Sports
- Events & Goals
- Training Profile
- Workout Connection placeholder
- onboarding progress
- validation
- persistence

Use the existing API layer if available.
If backend endpoints do not exist, create typed service interfaces and temporary mock implementations.

At the end:
- list files changed
- explain architecture decisions
- list remaining TODOs
- run existing tests/lint/typecheck
```

---

# DEFINITION OF DONE

## 112. Athlete Screen Definition of Done

A screen is complete when:

- UI follows Sage design system
- loading state exists
- empty state exists where relevant
- error state exists
- data is typed
- API/service is separated from presentation
- navigation works
- primary controls have accessibility labels
- no unmarked fake data remains
- TypeScript passes
- lint passes
- existing tests do not break

---

## 113. Admin Screen Definition of Done

An admin screen is complete when:

- route is role protected
- data loads through service/API layer
- loading state exists
- error state exists
- empty state exists
- search/filter state works where specified
- important changes require confirmation
- audit metadata is shown where relevant
- authorization is enforced server-side

---

# FUTURE LEVEL AUTOMATION

## 114. Level Evolution

Initial:

```text
Admin Assigns Level
```

Later:

```text
System Suggests Level
→ Admin Approves
```

Eventually:

```text
System Assigns Level
→ Admin Can Override
```

Do not jump directly to full automation.

Level formula should eventually be validated against:

- challenge performance
- training consistency
- training volume
- event experience
- workout history
- admin corrections

---

# PRODUCT COPY

## 115. Copy Principles

Use short, encouraging language.

Good:

```text
You're eligible
```

```text
8 pts to your next rival
```

```text
You passed 6 athletes
```

```text
Your level is under review
```

Avoid harsh wording around level or eligibility.

---

# FINAL PRODUCT FLOWS

## 116. New Athlete

```text
Open Sage
↓
Sign Up
↓
Complete Onboarding
↓
Connect Apple Health or Skip
↓
Level Under Review
↓
Home
↓
Browse Challenges
↓
Eligibility shown
↓
Admin approves Level
↓
Eligible challenge becomes joinable
↓
Join
↓
Sync Workout
↓
Earn Points
↓
Move Up Mountain
```

---

## 117. Returning Athlete

```text
Open Sage
↓
Home
↓
See Active Challenge
↓
Sync Workout
↓
Workout Result
↓
See Rank Change
↓
See Mountain Climb
```

---

## 118. Admin Athlete Flow

```text
Admin Login
↓
Athletes
↓
Select Athlete
↓
Review Last 90 Workouts
↓
Review Training Summary
↓
See Suggested Level
↓
Assign / Change Level
↓
Save
```

---

## 119. Admin Challenge Flow

```text
Challenges
↓
Create Challenge
↓
Set Eligible Levels
↓
Set Sports
↓
Set Scoring
↓
Set Bonuses
↓
Set Rules
↓
Set Rewards
↓
Review
↓
Publish
```

---

# FINAL PRODUCT PRINCIPLE

## 120. Sage Experience

The complete product should communicate:

> Your race gives you the finish line. Sage makes the training journey fun.

Sage should reward showing up, make nearby competition visible, and turn every synced workout into a meaningful change in the athlete's world.

An athlete should be able to understand their challenge status, score, rank, next rival, eligibility, and next action within a few seconds.
