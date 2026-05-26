# Fun Predict

A social prediction market app for friend groups. Before a night out, trip, or any event, friends post predictions about what will happen, everyone bets on them with fun bucks, and after the event an adjudicator resolves the bets and payouts are calculated. The person with the best instincts (and biggest balance) wins bragging rights.

**Live app:** https://stasahani1.github.io/fun_predict/

## How It Works

1. **Create or join an event** — One person creates an event and shares the 6-character code with the group
2. **Post predictions** — Anyone in the group can post predictions about what will happen. Two types:
   - **Open** — everyone can see it and bet on it
   - **Tagged** — specific people are tagged and excluded from betting on it
3. **Place bets** — Each bet costs $10 of fun bucks. Odds update in real-time as bets come in (parimutuel system)
4. **Event happens** — No more bets allowed, everyone can watch the odds
5. **Resolve** — The event creator marks each prediction as Happened / Didn't Happen / Void
6. **Results** — Payouts are calculated, leaderboard shows who came out on top

## Payout System

Uses a parimutuel betting model:
- Fixed $10 per bet
- Total pool = all bets combined
- Winners split the entire pool proportionally
- Example: 3 YES bets, 7 NO bets → $100 pool. If YES wins, each YES bettor gets $33.33
- Voided predictions refund everyone
- Starting balance is customizable when creating an event ($50, $100, $200, $500, or custom)

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion
- **Backend:** Firebase (Authentication, Cloud Firestore)
- **Hosting:** GitHub Pages via GitHub Actions
- **Auth:** Google Sign-In

## What's Been Built

- Google authentication (one-tap sign-in)
- Event creation with customizable starting balance
- Event joining via 6-character codes
- Event dashboard with real-time phase tracking (Posting → Betting → Live → Resolving → Complete)
- Prediction posting with Open and Tagged types
- Betting view with live odds, potential payout display, and balance tracking
- Tagged member filtering (tagged users can't bet on predictions about them)
- Resolution view for the event creator to mark outcomes
- Payout calculation and balance updates
- Results page with leaderboard, personal stats, and bet-by-bet breakdown
- Animated UI with page transitions, card animations, and confetti on results
- Mobile-first responsive design
- Automatic deployment to GitHub Pages on push

## Project Structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Routes and auth state
├── firebase.js               # Firebase config
├── index.css                 # Tailwind + custom theme
├── components/
│   ├── Layout.jsx            # Nav bars, page shell
│   ├── ProtectedRoute.jsx    # Auth guard
│   ├── PredictionCard.jsx    # Prediction display with odds
│   ├── BetCard.jsx           # Compact bet display
│   ├── Leaderboard.jsx       # Ranked standings
│   └── PhaseIndicator.jsx    # Event phase progress bar
├── pages/
│   ├── Landing.jsx           # Sign-in splash screen
│   ├── CreateEvent.jsx       # New event + event list
│   ├── JoinEvent.jsx         # Join via code
│   ├── EventDashboard.jsx    # Main event view
│   ├── PostPrediction.jsx    # Create predictions
│   ├── BettingView.jsx       # Place bets
│   ├── ResolveView.jsx       # Creator resolves outcomes
│   └── Results.jsx           # Final leaderboard + payouts
└── utils/
    ├── payouts.js            # Parimutuel math
    └── helpers.js            # Join codes, formatting, phase config
```

## Local Development

```bash
npm install
npm run dev
```

Requires a Firebase project with Authentication (Google) and Firestore enabled. Config goes in `src/firebase.js`.

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.
