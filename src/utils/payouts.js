const BET_AMOUNT = 10;

/**
 * Calculate the implied probability for YES outcome.
 * Returns a number between 0 and 1.
 */
export function impliedProbability(totalYes, totalNo) {
  const total = totalYes + totalNo;
  if (total === 0) return 0.5;
  return totalYes / total;
}

/**
 * Calculate what a bettor would win if their side wins.
 * Returns the total payout (including their original bet).
 */
export function potentialPayout(totalYes, totalNo, side) {
  const totalPool = (totalYes + totalNo) * BET_AMOUNT;
  // Add 1 to the chosen side to simulate this bet being placed
  const newYes = side === "yes" ? totalYes + 1 : totalYes;
  const newNo = side === "no" ? totalNo + 1 : totalNo;
  const newPool = (newYes + newNo) * BET_AMOUNT;
  const winners = side === "yes" ? newYes : newNo;
  if (winners === 0) return 0;
  return newPool / winners;
}

/**
 * Calculate the actual payout per winning bet after resolution.
 */
export function calculatePayout(totalYes, totalNo, resolution) {
  if (resolution === "void") return BET_AMOUNT;
  const totalPool = (totalYes + totalNo) * BET_AMOUNT;
  if (resolution === "yes") {
    return totalYes === 0 ? 0 : totalPool / totalYes;
  }
  if (resolution === "no") {
    return totalNo === 0 ? 0 : totalPool / totalNo;
  }
  return 0;
}

/**
 * Calculate net profit for a single bet.
 */
export function calculateProfit(totalYes, totalNo, resolution, side, amount) {
  if (resolution === "void") return 0;
  if (resolution === side) {
    const payout = calculatePayout(totalYes, totalNo, resolution);
    return payout - amount;
  }
  return -amount;
}

/**
 * Format odds as a percentage string.
 */
export function formatOdds(totalYes, totalNo) {
  const prob = impliedProbability(totalYes, totalNo);
  return {
    yes: `${Math.round(prob * 100)}%`,
    no: `${Math.round((1 - prob) * 100)}%`,
  };
}

export { BET_AMOUNT };
