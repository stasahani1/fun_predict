# Fun Predict — Feature Upgrade Plan

## Context

The app is a working prediction market for friend groups (React + Vite + Firebase + Tailwind + Framer Motion), deployed on GitHub Pages. Core flows work: auth, event creation/joining, prediction posting (open/tagged), betting with parimutuel odds, resolution, payouts, and leaderboard. The goal now is to make it look and feel like a polished Kalshi-inspired product while leaning into the social features that differentiate it from serious prediction markets.

---

## Batch 1: Prediction Data Model + Resolution Criteria + Categories

Highest-impact changes — improve trust and discoverability. Both modify the prediction creation form and Firestore schema together.

### Firestore schema additions (prediction documents)
```
resolutionCriteria: string   // "How will we know this happened?"
category: string             // one of: drinking, romance, logistics, chaos, people, other
```

### Files to modify

**`src/utils/helpers.js`** — Add `PREDICTION_CATEGORIES` constant:
```js
export const PREDICTION_CATEGORIES = [
  { id: "drinking", label: "Drinking", emoji: "🍻", color: "bg-orange-100 text-orange-700" },
  { id: "romance", label: "Romance", emoji: "💕", color: "bg-pink-100 text-pink-700" },
  { id: "logistics", label: "Logistics", emoji: "📋", color: "bg-blue-100 text-blue-700" },
  { id: "chaos", label: "Chaos", emoji: "🌪️", color: "bg-red-100 text-red-700" },
  { id: "people", label: "People", emoji: "👤", color: "bg-purple-100 text-purple-700" },
  { id: "other", label: "Other", emoji: "✨", color: "bg-gray-100 text-gray-600" },
];
```

**`src/pages/PostPrediction.jsx`** — Add three new form fields:
1. Category selector (horizontally scrollable pills, between type toggle and text field)
2. Resolution criteria textarea ("How will we know this happened?", required, 150 char limit)
3. Add `category` and `resolutionCriteria` to the `addDoc` payload (line 47)

**`src/components/PredictionCard.jsx`** — Display enhancements:
- Add category badge (emoji + colored pill) next to creator name (line 23-31)
- Add resolution criteria below the creator line as italic `text-xs text-gray-400` with ⚖️ prefix

**`src/pages/ResolveView.jsx`** — Show resolution criteria as a `bg-yellow-50 text-yellow-700` callout above the resolve buttons so the adjudicator has context

**`src/pages/BettingView.jsx`** — Add category filter bar (scrollable pills with "All" default) below the balance display (line 132), filter predictions client-side

---

## Batch 2: Odds Display Upgrade (Animated + Dual-Format + Typography)

Visual polish pass. All about making numbers feel alive and legible.

### New file: `src/components/AnimatedNumber.jsx`
Rolling number component using Framer Motion's `useSpring` + `useTransform`:
- Props: `value`, `format` ("percent" | "currency"), `className`
- Spring config: `stiffness: 200, damping: 30` (~250ms natural transition)
- Includes `tabular-nums` class by default for stable digit widths

### Files to modify

**`src/utils/payouts.js`** — Add `formatDualOdds(totalYes, totalNo)` helper returning `{ yes: { percent, payout }, no: { percent, payout } }`

**`src/components/PredictionCard.jsx`** — Replace static odds text (lines 34-47):
- Probability as `AnimatedNumber` with `format="percent"`, sized `text-2xl font-extrabold`
- Payout line below: `$10 → $X.XX` using `AnimatedNumber` with `format="currency"`, sized `text-xs`
- Add directional indicator: track previous odds via `useRef`, show `↑ 4%` / `↓ 3%` badge with `AnimatePresence` (auto-fades after 3s)
- Labels ("YES"/"NO"): `text-xs font-semibold uppercase tracking-wide`

**`src/pages/BettingView.jsx`** — Same dual-format odds display (lines 167-194), replace static text with `AnimatedNumber` components. Always show odds even when totalBets is 0 (show 50/50 default).

**`src/components/Leaderboard.jsx`** — Add `tabular-nums` class to balance and profit numbers

**`src/index.css`** — No changes needed; Tailwind v4 has `tabular-nums` built in

---

## Batch 3: Social Layer (Comments + Who Bet What)

The engagement multiplier. Comments are the biggest session-time unlock; social bets are the whole point of a friend group app.

### Firestore schema addition
```
events/{eventId}/predictions/{predId}/comments/{commentId}
  userId: string
  userName: string
  userPhotoURL: string
  text: string (max 280 chars)
  createdAt: serverTimestamp
```

### New file: `src/components/CommentThread.jsx`
- Props: `eventId`, `predictionId`, `user`
- Collapsed state: "💬 3 comments" link
- Expanded: list of comments (avatar, name, text, relative time) + input field with send button
- Real-time `onSnapshot` on comments subcollection, ordered by `createdAt asc`
- `AnimatePresence` for new comments sliding in

### Files to modify

**`src/components/PredictionCard.jsx`** — Add new props: `eventId`, `user`, `bets` (optional array)
- Render `CommentThread` after resolution badge (before `{children}`)
- Render social bets section when `bets` prop provided: show colored pills like "Sam: YES", "Alex: NO", cap at 5 + "+N more"

**`src/pages/EventDashboard.jsx`** — New `onSnapshot` listener on `events/{eventId}/bets` collection; group bets by `predictionId`; pass grouped bets + `eventId` + `user` to each `PredictionCard`

**`src/pages/BettingView.jsx`** — Expand the existing bets listener (lines 51-66) to track ALL bets (not just current user's). Show who bet what below odds display as compact pills.

**`src/pages/Results.jsx`** — Pass `eventId` and `user` to `PredictionCard` instances so comments work on the results page too

---

## Batch 4: Predictions About Me + Personality Awards

Social features unique to this app — the "moat."

### New file: `src/components/PersonalityAwards.jsx`
Computes and displays fun awards after event completion:
- "Oracle" — highest accuracy bettor
- "Most Predicted About" — most tagged predictions
- "Degen" — most contrarian bets (against majority)
- "Big Winner" — highest net profit
- "Consistently Wrong" — lowest accuracy (fun award)
- Each award: emoji + name + recipient + stat, staggered entrance animation

### Files to modify

**`src/pages/EventDashboard.jsx`** — When user has tagged predictions, show a "Predictions About You (N)" button that expands an inline list of those predictions with their odds/resolution (user can see but not bet)

**`src/pages/Results.jsx`** — Render `PersonalityAwards` between the leaderboard and "Your Bets" section. Pass `predictions`, `balances`, and all bets as props.

---

## Batch 5: Profile Page + Cross-Event Stats

### New file: `src/pages/Profile.jsx`
Route: `/profile` (current user)
- Header: name, photo, member since
- All-time stats card: total events, total bets, net winnings, win rate
- Event history: list of events with final rank
- Data: query all events where user is a member, fetch each event's balances/bets docs

### Files to modify

**`src/App.jsx`** — Add route: `/profile` → `<Profile user={user} />`

**`src/components/Layout.jsx`** — Add Profile to bottom nav: `{ path: "/profile", label: "Profile", icon: "👤" }`

---

## Deferred (future sessions)
- Prediction templates when tagging ("Will [Sam] [verb] before [time]?")
- Multi-outcome markets ("Who will be first to leave?")
- Over/under markets with slider
- Gamification (badges, streaks, Brier calibration score)
- Live "sweat" view during events
- PWA support (manifest.json, service worker, iOS meta tags)
- Shareable post-event receipt images

---

## Verification

After each batch:
1. `npm run dev` — verify no build errors
2. Create an event, post predictions with categories + resolution criteria
3. Open incognito, join event, verify category filters and resolution criteria visible
4. Place bets, verify animated odds transitions and dual-format display
5. Post comments on predictions, verify real-time sync
6. Verify "who bet what" pills appear on predictions
7. Resolve predictions, verify personality awards appear on results
8. Check profile page shows cross-event stats
9. `npm run build` — verify production build succeeds
10. Push to GitHub, verify deploy succeeds
