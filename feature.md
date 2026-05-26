# Sage — Screen & Flow Specification

**For use with Claude Design to create UI designs.**

Sage is a dark-mode endurance training app for Indian athletes. Users log training via Strava, join races/challenges, and connect with a local training community.

---

## Design System

| Token | Color | Usage |
|---|---|---|
| Background | `#0a0a0a` | Page backgrounds |
| Surface | `#1a1a1a` | Cards, modals, inputs |
| Border | `#2a2a2a` | Dividers, card borders |
| Text | `#f5f5f5` | Primary text |
| Muted | `#737373` | Secondary text, labels |
| Green | `#4ade80` | Primary accent, CTAs, success |
| Orange | `#fb923c` | Secondary accent, warnings |
| Red | `#f87171` | Destructive actions, errors |
| Blue | `#60a5fa` | Info states |
| Purple | `#a78bfa` | Admin, special features |

**Typography:** All font weights are heavy (700–900). Section headers are ALL CAPS + letter-spacing. Hero numbers are font-black.

**Cards:** Rounded corners (16–20px), 1px border, 16–20px padding. No shadows — separation via background color difference only.

---

## Auth Flow

### 1. Login Screen
**Route:** `/(auth)/login`

Single-action screen. No form fields.

**Layout (top to bottom):**
- SAGE wordmark (large, green, font-black)
- Tagline: "Train with the village. Compete. Improve. Win."
- Full-width "Continue with Google" button (white bg, Google icon, black text)
- Loading spinner overlay while auth is in progress

**Notes:** This is the only way to sign in. No email/password, no Strava button.

---

### 2. Onboarding / Pending Screen
**Route:** `/pending` — shown when account awaits payment approval

**Layout (top to bottom):**
- SAGE wordmark (green)
- "Hi, [First Name]!" greeting
- Subtitle: "Tell us how you train"
- Section label: "I primarily train as a..."
- 5 sport type cards (full-width, stacked):
  - 🏃 Runner — Road, trail, track
  - 🚴 Cyclist — Road, gravel, MTB
  - 🏊 Swimmer — Pool, open water
  - 🏅 Triathlete — Swim, bike, run
  - ⚡ Hybrid — Mix of disciplines
  - Selected card: green border + green tint bg + checkmark badge
- SAVE button (green, appears only when selection differs from saved)
- "Account pending" info card with ⏳ icon and "Check Status" button
- "Sign Out" button (red tint, bottom)

---

## Main App — Tab Bar

7 tabs: **Home · Challenges · Ranks · Sessions · Log · Village · Profile**

Tab bar is always dark (`#111` bg), active tab uses green tint.

---

### 3. Home Screen
**Route:** `/(app)/index` — Home tab (🏠)

Dashboard for races. Pull-to-refresh supported.

**Layout:**
- **Header row:** "Welcome back / [FirstName]" on left. Right side: 🔥 streak badge (if streak > 0) + Sign Out pill.
- **Your Races section** (only if user has joined races):
  - Section label: "YOUR RACES"
  - Stacked RaceCards — each shows: race name, city, date, sport type pills, user's score + sessions + streak
  - Tapping a race card navigates to Race Detail
  - Leave race swipe/action available
- **Discover Races section:**
  - Section label: "DISCOVER RACES"
  - Horizontal scrolling sport filter pills: All / Run / Ride / Swim / WeightTraining / Rowing
  - Stacked RaceCards for races not yet joined — each has a "Join" button
  - Empty state: 🏁 "No open races right now. Check back soon."

---

### 4. Challenges Screen
**Route:** `/(app)/challenges` — Challenges tab (🎯)

Browse time-limited training challenges grouped by category.

**Layout:**
- **Header:** Muted "[FIRSTNAME]" label above large "Challenges" title
- **Featured section** (full-width cards, stacked):
  - Card has colored tint background (per challenge's `cover_color`)
  - Faded sport icon watermark in bottom-right corner
  - Badges: ⭐ FEATURED + optional 🏷 BRAND NAME + JOINED ✓ (if joined)
  - Large title (28px, font-black)
  - Subtitle text
  - Stats row: TARGET · DAYS LEFT · ATHLETES · REWARD BADGE
- **Horizontal scroll sections** (CARD_WIDTH = 70% screen width):
  - 🔥 Your Active
  - 🔥 Trending
  - 🏷 Brand Challenges
  - 💫 Beginner Friendly
  - 👑 Elite
  - Each section only renders if it has content
- **Challenge Card** (in horizontal sections):
  - Difficulty badge (BEGINNER green / INTERMEDIATE orange / ELITE red)
  - JOINED ✓ badge (green, if joined)
  - Title (18px, font-black)
  - Target value + days left
  - Progress bar + progress text (if joined)
  - 👥 participant count + 🏅 reward name
  - Faded sport icon as background watermark
- **Empty state:** 🎯 "No challenges yet / Check back soon. New challenges drop every week."
- **Loading state:** Green ActivityIndicator centered

---

### 5. Challenge Detail Screen
**Route:** `/(app)/challenge-detail?id=[id]` — Hidden screen (no tab)

Navigate here by tapping any challenge card.

**Layout:**
- **Hero banner (220px tall):**
  - Colored tint background matching challenge color
  - Sport icon watermark bottom-right (130px, 10% opacity)
  - Back button (< arrow, dark pill, absolute top-left)
  - Difficulty badge + optional BRAND badge
  - Challenge title (26px font-black)
  - Subtitle text
- **Stats card:** DAYS LEFT · ATHLETES · TARGET · YOUR RANK (if joined) — horizontal row, each centered
- **Progress card** (only if joined):
  - Label: "YOUR PROGRESS"
  - Progress bar (8px height, colored)
  - Progress text: "X.X / [target][unit]" and percentage on right
- **Join / Leave button:**
  - Join: Solid green, "Join Challenge"
  - Leave: Surface bg + border, grey text, "Leave Challenge"
  - Loading spinner when action in progress
- **Reward card** (only if reward exists):
  - Gold tint bg + border
  - 🏅 icon + reward title
  - Reward description
- **Tab switcher:** LEADERBOARD | ABOUT (colored active tab)
- **Leaderboard tab:**
  - Empty state: 🏁 "No athletes yet / Be the first to join!"
  - Leaderboard rows: rank medal (🥇🥈🥉 or number) · initials avatar · name · progress value
  - Current user's row: colored tint bg + colored border
- **About tab:**
  - Description card (if exists)
  - Details grid: Sport / Type / Target / Starts / Ends / Difficulty — key-value rows with dividers
  - Brand card (if brand challenge): brand name, 📸 Instagram link, 🌐 website link

---

### 6. Ranks Screen
**Route:** `/(app)/ranks` — Ranks tab (🏆)

Race leaderboard viewer.

**Layout:**
- **Header:** "Leaderboard" title
- **Race selector:** Horizontal scroll pills for each race the user has joined
- **Sort pills:** Score · Sessions · Hours · Streak
- **Your rank callout card:** Shows current rank position for selected sort
- **Podium (top 3):**
  - Center: 🥇 1st (tallest platform)
  - Left: 🥈 2nd
  - Right: 🥉 3rd
  - Each shows: initials avatar, name, score
- **Full leaderboard list below podium:**
  - Rank number · Initials avatar · Name · Score/Sessions/Hours/Streak value
  - Current user row is highlighted
- **Empty state** if user hasn't joined a race yet

---

### 7. Sessions Screen
**Route:** `/(app)/sessions` — Sessions tab (🗓️)

Find and join group training sessions.

**Layout:**
- **Header:** "Sessions" title + "HOST +" green button (top right)
- **Filter pills (horizontal scroll):**
  - All
  - 📍 Nearby (blue — requests location permission, shows "..." while loading)
  - ⚡ Mine (purple — shows host's own sessions)
  - Sport filters: Run / Ride / Swim / Trail
- **Session Card list:**
  - Sport emoji + session title
  - Host avatar + name (tappable)
  - 📅 Date · ⏰ Time · 📍 Location
  - Distance · Duration
  - Spots filled / max (e.g. "4 / 12 spots")
  - Status badge (Open green / Full red / Draft grey)
  - Distance from user (nearby filter only)
  - Enrollment status badge (Pending / Enrolled / Rejected — athlete view)
- **Empty states** per filter with emoji and optional HOST button
- **Loading state** while fetching

---

### 8. Session Detail Screen
**Route:** `/(app)/session-detail?id=[id]` — Hidden screen

**Layout:**
- **Header:** Back button + Edit button (host only)
- Status badge row (CANCELLED / ARCHIVED / COMPLETED) if applicable
- Sport emoji (large) + session title
- Host info row: avatar + "Hosted by [Name]"
- **Info box:**
  - 📅 Date
  - ⏰ Start time
  - 📍 Meeting point
  - 🏁 Distance
  - ⏱ Duration
  - 👥 X / Y spots
- **Requirements section** (sport-specific):
  - 🚴 Ride: ride type, min FTP, avg speed, elevation
  - 🏃 Run: workout type, surface, min pace
- **Description** (if exists)
- **Links section:**
  - 🗺 Map link button
  - 🔗 Route link button (host always, athlete only if enrolled)
  - 💬 WhatsApp button (host always, athlete only if enrolled)

**HOST VIEW — Tab bar with badge counts:**

- **Requests tab:** Pending requests list with Accept / Reject buttons. Rejected section below with Undo button.
- **Enrolled tab:** Enrolled athletes list. Attend ✓ / No-show ✗ toggle buttons. Locked once session is completed.
- **Settings tab:** Complete Session button, Archive button, Cancel button, Re-activate button (if archived).

**ATHLETE VIEW — CTA area (changes by status):**
- Not enrolled: Green "REQUEST TO JOIN" button
- Pending: "Request Sent" message + Cancel button
- Enrolled: "You're In ✓" with WhatsApp link + Leave option
- Rejected: "Request Rejected" message
- Attended / No-show: Outcome message
- Full: "Session Full" message
- Cancelled/Archived: Greyed message

---

### 9. Session Create Screen
**Route:** `/(app)/session-create` — Navigated from Sessions HOST button

**Layout:**
- **Header:** Back arrow + "Host a Session" title
- **Sport selector:** 4 pill buttons — Ride / Run / Swim / Trail (changes form fields below)
- **Form fields:**
  - Title (text input, 60 char max)
  - Description (multiline)
  - Date (date picker)
  - Start time (time picker)
  - Meeting point (location search input — shows address + lat/lng)
  - Distance (numeric)
  - Duration in minutes (numeric)
  - Max participants (numeric, default 20)
- **Sport-specific fields:**
  - **Ride:** Ride type pills (Recovery / Endurance / Tempo / Race Pace / Climbing / Social), Min FTP, Avg speed km/h, Elevation gain
  - **Run:** Workout type pills (Easy / Long / Intervals / Tempo / Race Sim), Surface pills (Road / Trail / Track), Min pace (mm:ss)
- **Route link** (text input — Strava/Komoot URL)
- **WhatsApp group link** (text input)
- **Create Session** button (green, full-width, bottom)

---

### 10. Training Log Screen
**Route:** `/(app)/log` — Log tab (⚡)

Activity history from Strava.

**Layout:**
- **Header:** "Training Log" title
- **Race filter pills:** "All" + one pill per joined race
- **Summary bar** (when activities exist):
  - X activities · Y hrs Z min total
- **Race context card** (when race filter selected):
  - Which sport types count + date window for the race
- **Activity list:**
  - ActivityItem per logged activity:
    - Sport emoji
    - Activity name
    - Date
    - Distance or duration
    - Points earned (if race filter is active)
- **Empty state:** Strava sync prompt with connect button

---

### 11. Village Screen
**Route:** `/(app)/village` — Village tab (👥)

Membership management and referral program.

**Layout:**
- **Header:** "Village" title + "Your community & membership" subtitle

**Annual Pass Card:**
- Price display (e.g. ₹2,999/year)
- Status badge: ACTIVE (green) or PENDING (orange)
- Expiry date if active (e.g. "Active until May 2027")
- If pending: UPI payment instructions + "Upload Screenshot" button

**Refer & Earn Card:**
- Incentive: "Earn ₹[X] cash + [Y] bonus points per referral"
- Referral code in dark pill with Share button
- Earnings summary: [N] Invited · ₹[X] Earned
- Referral list rows: name + status badge (Pending / Rewarded / Void)
- "Request Payout" button (shows if pending payouts exist)

---

### 12. Profile Screen
**Route:** `/(app)/profile` — Profile tab (👤)

Full stats, integrations, and account management.

**Layout:**
- **Profile header:**
  - Large initials avatar (colored circle)
  - Full name (font-black)
  - Email (muted)
  - ACTIVE MEMBER badge (green, if active)

- **All-time stats card:**
  - Score · Sessions · Hours · Races · Best Streak — 5-column grid

- **Distance Breakdown** (if activities exist):
  - 🏃 Running: X km · N sessions
  - 🚴 Cycling: X km · N sessions
  - 🏊 Swimming: X km · N sessions
  - Total elevation: X m
  - Total calories: X kcal

- **Heart Rate Zones** (if HR data exists):
  - Avg HR · Max HR
  - Zone bars (Z1–Z5) with color, time in zone, percentage

- **Training Streak heatmap:**
  - 10-week grid (dots per day)
  - Colored dots = activity logged, empty = rest day

- **Sessions Attended:**
  - List of completed group sessions
  - Session title + date + host name + ✅ badge

- **Strava Integration card:**
  - Status: Connected (green) or Not Connected (grey)
  - Last activity date + activity count
  - Connect / Reconnect button
  - Sync Now button (if connected)

- **Apple Health / Health Connect card** (native only):
  - Platform-appropriate label
  - Import button

- **Sign Out button** (red tint, full-width, bottom)

---

### 13. Race Detail Screen
**Route:** `/(app)/race-detail?id=[id]` — Hidden screen (navigate from Home race cards)

**Layout:**
- **Header:** Back button · Race name · City · "X days left" · Your rank badge
- Race progress bar (% of challenge window elapsed)
- **Tab switcher:** Ranks · Awards · Tips

**Ranks tab:**
- Sort pills: Score / Sessions / Hours / Streak
- Your rank callout card
- Podium: 2nd left · 1st center (tallest) · 3rd right — each with initials avatar + name + value
- Full leaderboard list (same as Ranks screen)

**Awards tab:**
- "X / Y achievements unlocked" counter
- 2-column grid of achievement cards:
  - Emoji + title + description
  - Unlocked: full opacity + ✓ badge
  - Locked: 45% opacity, no badge
- Achievement categories: Sessions milestones, Streak milestones, Hours milestones, Score thresholds

**Tips tab:**
- Your snapshot: Rank · Score · Sessions · Streak
- Gap to next rank card (purple) or Leading message (yellow) if in 1st
- Race window card: days left + % complete
- Final push alert (red, if ≤7 days left)
- Numbered tips list (custom from admin or sport-specific defaults)

---

## Admin Panels

Separate tab group with orange accent color (`#fb923c`). Only visible to users with `role = 'admin'`.

### 14. Admin Dashboard
**Route:** `/(admin)/index`

**Layout:**
- "Admin Dashboard" header
- 2-column stat cards grid:
  - Total Users
  - Active Users (green)
  - Pending Users (orange)
  - Open Races (blue)
  - Total Entries (purple)
- Alert banner if pending users exist → taps to Payments tab

---

### 15. Payments Screen
**Route:** `/(admin)/payments`

**Layout:**
- "Pending Payments ([N])" header
- User cards, each showing:
  - Name + email
  - Signup date
  - Strava badge: "Connected" (green) or "No Strava" (orange)
  - Payment screenshot link (or "No screenshot" warning)
  - **Approve** button (green) + **Reject** button (red)

---

### 16. Athletes Screen
**Route:** `/(admin)/athletes`

**Layout:**
- "Athletes" header
- Search input (name or email)
- Filter pills: All / Active / Pending / Suspended
- Athlete cards:
  - Name + email
  - Status badge (color-coded)
  - Race count · Plan expiry · Last activity date
  - "Resync" button (triggers backfill for all races)
  - "Mark Referral Paid" button (if applicable)

---

### 17. Races Screen
**Route:** `/(admin)/races`

**Layout:**
- "Races" header + "+ Add Race" button (orange)
- Race cards:
  - Name + city
  - Status badge (Open green / Draft orange)
  - Race date · Challenge date range
  - Sport type pills
  - Status toggle buttons: Open / Close / Draft
  - "Tips" button (purple) → opens Tips modal

**Add Race modal (bottom sheet):**
- Name, City inputs
- Race date, Challenge start/end date inputs
- Sport type multi-select
- Status select
- Save button

**Tips modal:**
- Race name label
- "Add tip" multiline input + Add button
- Numbered list of existing tips:
  - Tip text
  - ↑ ↓ reorder buttons
  - 🗑 delete button
- Done button

---

## Navigation Map

```
Login ──→ Pending (if payment pending)
       └→ Home (if active)

Home Tab
  └→ Race Detail
       └→ (back)

Challenges Tab
  └→ Challenge Detail
       └→ (back)

Ranks Tab (self-contained)

Sessions Tab
  ├→ Session Detail
  │    └→ Session Edit (host only)
  └→ Session Create

Log Tab (self-contained)

Village Tab (self-contained)

Profile Tab (self-contained)
```

---

## Key States to Design

Every data screen needs these states:

1. **Loading** — ActivityIndicator (green) centered
2. **Empty** — Large emoji + title + description + optional CTA
3. **Error** — Same pattern as empty but with error message
4. **Populated** — Full content
5. **Refreshing** — Pull-to-refresh indicator (green tint)

For action buttons:
- **Default** — Normal state
- **Loading** — Spinner replaces text, button disabled
- **Disabled** — Reduced opacity
