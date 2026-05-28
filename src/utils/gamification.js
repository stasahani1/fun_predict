/**
 * Calculate Brier score for a single bet.
 * Lower = better calibration. 0 = perfect, 0.25 = random.
 */
export function brierScore(impliedProb, won) {
  const outcome = won ? 1 : 0;
  return Math.pow(impliedProb - outcome, 2);
}

/**
 * Average Brier score across all scored bets.
 */
export function computeAverageBrier(scoredBets) {
  if (!scoredBets || scoredBets.length === 0) return null;
  const sum = scoredBets.reduce((acc, b) => acc + b, 0);
  return sum / scoredBets.length;
}

/**
 * Format Brier score into label + color.
 */
export function formatBrierScore(score) {
  if (score === null || score === undefined) {
    return { label: "No data", color: "text-gray-400" };
  }
  if (score <= 0.1) return { label: "Excellent", color: "text-green-600" };
  if (score <= 0.2) return { label: "Good", color: "text-blue-600" };
  if (score <= 0.3) return { label: "Average", color: "text-yellow-600" };
  return { label: "Needs Work", color: "text-red-500" };
}

export const BADGE_DEFINITIONS = [
  {
    id: "oracle",
    emoji: "\uD83D\uDD2E",
    name: "Oracle",
    description: ">70% win rate with 10+ bets",
    check: (stats) => stats.winRate > 0.7 && stats.totalBets >= 10,
  },
  {
    id: "insider",
    emoji: "\uD83D\uDD75\uFE0F",
    name: "Insider",
    description: ">80% on tagged predictions (5+ tagged bets)",
    check: (stats) =>
      stats.taggedWinRate > 0.8 && stats.taggedBets >= 5,
  },
  {
    id: "contrarian",
    emoji: "\uD83E\uDD21",
    name: "Contrarian",
    description: "3+ contrarian wins",
    check: (stats) => stats.contrarianWins >= 3,
  },
  {
    id: "houseguest",
    emoji: "\uD83C\uDFE0",
    name: "Houseguest",
    description: "20+ total bets across all events",
    check: (stats) => stats.totalBetsAllTime >= 20,
  },
  {
    id: "degen",
    emoji: "\uD83C\uDFB0",
    name: "Degen",
    description: "10+ bets in a single event",
    check: (stats) => stats.maxBetsInEvent >= 10,
  },
];

/**
 * Returns array of earned badge IDs.
 */
export function computeBadges(stats) {
  return BADGE_DEFINITIONS.filter((b) => b.check(stats)).map((b) => b.id);
}
