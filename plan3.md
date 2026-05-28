# Plan 3: Advanced Market Types, Gamification, Live View, PWA, Receipts

## Context

Plan2 shipped categories, resolution criteria, animated odds, comments, social bets, personality awards, and a profile page. This plan implements all previously deferred features plus additional ideas: prediction templates, multi-outcome markets, over/under markets, conditional markets, advanced gamification (Brier score, badges, streaks), a live "sweat" view, PWA support, and shareable post-event receipt images.

---

## Batch 1: Prediction Templates (when tagging)

Smallest change, zero schema changes, pure UX improvement.

### New file: `src/utils/templates.js`
- `TEMPLATE_VERBS` array: "leave early", "spill a drink", "hit on someone", "fall asleep", "lose their phone", "dance first", etc.
- `TEMPLATE_TIMES` array: "midnight", "before dinner", "by 2am", "before the event ends", etc.
- `generateTemplates(taggedNames)` — returns up to 6 shuffled template objects `{ text, resolutionCriteria }` using the tagged member names. Multi-person templates when 2+ tagged.

### Modify: `src/pages/PostPrediction.jsx`
- Import `generateTemplates`
- Add `templates` state, recompute via `useEffect` when `tagged` or `type` changes
- Render template pills between the member tagging area and the text field (only when `type === "tagged" && templates.length > 0`)
- Clicking a template fills both `text` and `resolutionCriteria`

---

## Batch 2: Multi-Outcome Markets

Biggest structural change — affects schema, payouts, creation, betting, resolution, and display.

### Firestore schema additions (prediction doc, type "multi")
```
type: "multi"
outcomes: [{ id: "outcome_0", label: "Sam", totalBets: 0 }, ...]
resolution: null | "outcome_0" | "void"   // winning outcome ID
totalYes: 0, totalNo: 0                   // unused, kept for backward compat
```

Bet doc: `side` stores outcome ID (e.g., `"outcome_0"`) instead of `"yes"`/`"no"`.

### New utility functions in `src/utils/payouts.js`
- `multiImpliedProbability(outcomes, outcomeId)` — uniform prior when no bets
- `multiPotentialPayout(outcomes, outcomeId)` — parimutuel: total pool / winners
- `multiCalculatePayout(outcomes, winningOutcomeId)` — actual payout after resolution
- `formatMultiOdds(outcomes)` — returns `[{ id, label, percent, payout, totalBets }]`
- `isBinaryPrediction(prediction)` — helper for type branching

### New file: `src/components/MultiOutcomeOdds.jsx`
- Props: `outcomes`, `onBet` (optional callback), `userBet`, `betting`
- Vertical list of outcome bars with label, probability %, payout line
- Bar width proportional to probability, uses `AnimatedNumber`
- If `onBet` provided, each row is clickable as a bet button
- Color rotation through palette

### New file: `src/components/MultiOutcomeCreator.jsx`
- Props: `outcomes`, `setOutcomes`, `members`
- Input to add outcome labels, remove buttons, min 2 / max 10
- "Use tagged members as outcomes" shortcut button

### Modify: `src/pages/PostPrediction.jsx`
- Type selector becomes 3+ options: Open, Tagged, Multi (row of pills)
- Render `MultiOutcomeCreator` when `type === "multi"`
- Add `outcomes` state, include in Firestore payload for type "multi"

### Modify: `src/pages/BettingView.jsx`
- Branch on `pred.type`: binary renders existing YES/NO, "multi" renders `MultiOutcomeOdds`
- `placeBet` accepts `outcomeId` parameter for multi
- Multi-outcome bet: use `runTransaction` to increment the specific outcome's `totalBets` in the outcomes array (Firestore can't `increment()` array element fields)

### Modify: `src/pages/ResolveView.jsx`
- Multi: show outcome buttons (creator picks winner) + Void button
- `resolvePrediction`: use `multiCalculatePayout` for multi, winner check is `bet.side === resolution` (works for both types)

### Modify: `src/components/PredictionCard.jsx`
- Branch on `prediction.type`: binary uses existing dual-format, multi uses read-only `MultiOutcomeOdds`
- Resolution badge for multi shows winning outcome label

### Modify: `src/pages/Results.jsx`
- "Your Bets" breakdown: show outcome label instead of YES/NO for multi
- Payout calc: use `multiCalculatePayout` when `pred.type === "multi"`

### Modify: `src/components/PersonalityAwards.jsx`
- Contrarian logic: for multi, contrarian = bet on outcome with below-average bets

---

## Batch 3: Over/Under and Conditional Markets

Both reuse binary payout infrastructure with relabeling.

### Firestore schema additions

**Over/Under (type "overunder"):**
```
line: 4.5, unit: "drinks", actualValue: null
totalYes = OVER bets, totalNo = UNDER bets
resolution: "yes" (OVER) | "no" (UNDER) | "void"
```

**Conditional (type "conditional"):**
```
condition: "If we go to the bar", conditionMet: null | true | false
Standard binary yes/no resolution (auto-voids if condition not met)
```

### New file: `src/components/OverUnderOdds.jsx`
- Large centered "4.5 drinks" line display
- OVER/UNDER cards (green/red) with animated percent + payout
- Reuses `AnimatedNumber`, same dual-format pattern as binary

### New file: `src/components/ConditionalBadge.jsx`
- Shows "IF: [condition]" badge — gray (unresolved), green (met), red (not met/voided)

### Modify: `src/pages/PostPrediction.jsx`
- Type selector adds Over/Under and Conditional options (5 total, 2-row grid on mobile)
- Over/Under form: "What are we counting?" + line number input + unit input
- Conditional form: "What's the condition?" + main prediction text
- `handleSubmit` spreads type-specific fields into payload

### Modify: `src/pages/BettingView.jsx`
- Over/Under: render `OverUnderOdds`, bet side maps OVER=yes, UNDER=no (reuses existing `placeBet`)
- Conditional: render `ConditionalBadge` above standard YES/NO odds

### Modify: `src/pages/ResolveView.jsx`
- Over/Under: "Enter actual value" number input, auto-resolve (over line = yes, under = no, equal = void), store `actualValue`
- Conditional: two-step — first "Was condition met?" (No = auto-void), then standard Happened/Didn't happen

### Modify: `src/components/PredictionCard.jsx`
- Over/Under: show `OverUnderOdds` read-only, display actual value after resolution
- Conditional: show `ConditionalBadge`

### Modify: `src/pages/Results.jsx`
- Bet labels: "OVER"/"UNDER" for overunder type, "Condition not met — Refunded" for conditional voids

---

## Batch 4: Advanced Gamification (Brier Score, Badges, Streaks)

### Firestore schema additions

**New top-level collection `users/{userId}`:**
```
displayName, photoURL, badges: string[]
currentStreak, longestStreak, lastBetCorrect: boolean
brierScoreSum, brierScoreCount, totalBetsAllTime
createdAt
```

**Bet doc addition:** `impliedProbAtBet: number` (0-1, stored at bet creation for Brier calculation)

### Brier Score math
- At bet time: store `impliedProbAtBet` = probability of chosen side after the bet
- At resolution: `score = (impliedProbAtBet - actualOutcome)^2` where outcome is 1 (won) or 0 (lost)
- Lower average = better calibration. 0.0 = perfect, 0.25 = random
- Voided predictions skipped. Legacy bets without `impliedProbAtBet` fall back to 0.5

### New file: `src/utils/gamification.js`
- `brierScore(impliedProb, won)` — single bet score
- `computeAverageBrier(scoredBets)` — average across all bets
- `formatBrierScore(score)` — returns `{ label, color }` (Excellent/Good/Average/Needs Work)
- `BADGE_DEFINITIONS` array with check functions:
  - Oracle: >70% win rate, min 10 bets
  - Insider: >80% accuracy on tagged predictions, min 5 tagged bets
  - Contrarian: 3+ contrarian wins
  - Houseguest: 20+ total bets across all events
  - Degen: 10+ bets in a single event
- `computeBadges(stats)` — returns earned badge IDs

### New file: `src/components/BadgeDisplay.jsx`
- Earned badges: vibrant emoji + name + description
- Unearned badges: grayed out with lock icon + requirement tooltip
- Large mode (Profile) and small mode (inline)

### New file: `src/components/BrierScoreCard.jsx`
- Large Brier score number, quality label, gradient gauge bar
- "Based on N predictions" subtitle

### New file: `src/components/StreakDisplay.jsx`
- Flame emoji + "X correct in a row", longest streak secondary stat

### Modify: `src/pages/BettingView.jsx`
- In `placeBet`: compute and store `impliedProbAtBet` on the bet document

### Modify: `src/pages/ResolveView.jsx`
- After resolving + committing payout batch, update `users/{userId}` docs:
  - Increment `brierScoreSum` and `brierScoreCount`
  - Update `currentStreak` (increment on win, reset to 0 on loss)
  - Update `longestStreak` via read-then-update
  - Use `set` with `{ merge: true }` to create doc lazily

### Modify: `src/pages/Profile.jsx`
- Fetch `users/{userId}` doc for pre-computed stats
- Add sections: BrierScoreCard, BadgeDisplay (large), StreakDisplay
- Compute badges client-side from combined stats

### Modify: `src/components/PersonalityAwards.jsx`
- Add "Calibration King" award for best per-event Brier score

---

## Batch 5: Live "Sweat" View + PWA Support

### Firestore schema addition
```
events/{eventId}/presence/{userId}
  userId, userName, userPhotoURL, lastSeen: serverTimestamp
```

### New file: `src/pages/SweatView.jsx`
Route: `/event/:eventId/live` (read-only during live phase)
1. **"Your Position" hero card** — net unrealized value across all user bets based on current odds
2. **"Hot Markets"** — predictions sorted by most bets, live odds with AnimatedNumber
3. **"Who's Online"** — Firestore presence pattern (write every 30s, query lastSeen > now-60s), avatar row with green dots
4. **"Your Active Bets"** — user's bets with live payout tracking

### New utility in `src/utils/payouts.js`
- `unrealizedValue(prediction, betSide)` — expected value minus bet cost based on current odds

### New file: `public/manifest.json`
- App name, icons, start_url, display: standalone, theme_color: #9333ea

### New file: `public/sw.js`
- Basic service worker: cache-first for app shell, pass-through for Firebase API calls

### Modify: `index.html`
- PWA meta tags: manifest link, theme-color, apple-mobile-web-app-capable, apple-touch-icon
- Service worker registration script

### Modify: `src/App.jsx`
- Add route: `/event/:eventId/live` → `<SweatView user={user} />`

### Modify: `src/pages/EventDashboard.jsx`
- During "live" phase, add "Live Sweat View" button (orange-to-red gradient)

---

## Batch 6: Shareable Post-Event Receipt Images

### New file: `src/utils/receiptGenerator.js`
- `generateReceipt(data)` — Canvas-based PNG generation
- Purple-to-pink gradient background, white card
- Shows: app name, event name, user name, rank, net profit, top 4 predictions
- Returns Blob

### New file: `src/components/ShareReceiptButton.jsx`
- On click: generate receipt → Web Share API if available, else download PNG
- Loading spinner during generation

### Modify: `src/pages/Results.jsx`
- Render `ShareReceiptButton` after the "Your final standing" card
- Pass: eventName, userName, rank, totalPlayers, netProfit, topBets

---

## New Files Summary

| File | Batch |
|------|-------|
| `src/utils/templates.js` | 1 |
| `src/components/MultiOutcomeOdds.jsx` | 2 |
| `src/components/MultiOutcomeCreator.jsx` | 2 |
| `src/components/OverUnderOdds.jsx` | 3 |
| `src/components/ConditionalBadge.jsx` | 3 |
| `src/utils/gamification.js` | 4 |
| `src/components/BadgeDisplay.jsx` | 4 |
| `src/components/BrierScoreCard.jsx` | 4 |
| `src/components/StreakDisplay.jsx` | 4 |
| `src/pages/SweatView.jsx` | 5 |
| `public/manifest.json` | 5 |
| `public/sw.js` | 5 |
| `src/utils/receiptGenerator.js` | 6 |
| `src/components/ShareReceiptButton.jsx` | 6 |

## Modified Files Summary

| File | Batches |
|------|---------|
| `src/pages/PostPrediction.jsx` | 1, 2, 3 |
| `src/utils/payouts.js` | 2, 5 |
| `src/pages/BettingView.jsx` | 2, 3, 4 |
| `src/pages/ResolveView.jsx` | 2, 3, 4 |
| `src/components/PredictionCard.jsx` | 2, 3 |
| `src/pages/Results.jsx` | 2, 3, 6 |
| `src/components/PersonalityAwards.jsx` | 2, 4 |
| `src/pages/Profile.jsx` | 4 |
| `src/App.jsx` | 5 |
| `src/pages/EventDashboard.jsx` | 5 |
| `index.html` | 5 |

---

## Verification

After each batch:
1. `npm run dev` — no build errors
2. `npm run build` — production build succeeds
3. Batch 1: Create tagged prediction, verify templates appear and fill form
4. Batch 2: Create multi-outcome prediction, bet on outcome, resolve, verify payouts
5. Batch 3: Create over/under and conditional predictions, full lifecycle test
6. Batch 4: Check profile for Brier score, badges, streaks after completing an event
7. Batch 5: During live phase, open sweat view, verify presence and position tracking; install PWA from browser
8. Batch 6: On results page, click share, verify image generation and download/share
