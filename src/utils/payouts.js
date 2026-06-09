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

/**
 * Dual-format odds: probability percentage + potential payout for $10 bet.
 */
export function formatDualOdds(totalYes, totalNo) {
  const prob = impliedProbability(totalYes, totalNo);
  return {
    yes: {
      percent: Math.round(prob * 100),
      payout: potentialPayout(totalYes, totalNo, "yes"),
    },
    no: {
      percent: Math.round((1 - prob) * 100),
      payout: potentialPayout(totalYes, totalNo, "no"),
    },
  };
}

// --- Multi-Outcome Market Functions ---

/**
 * Implied probability for a specific outcome in a multi-outcome market.
 */
export function multiImpliedProbability(outcomes, outcomeId) {
  const totalBets = outcomes.reduce((sum, o) => sum + (o.totalBets || 0), 0);
  if (totalBets === 0) return 1 / outcomes.length;
  const outcome = outcomes.find((o) => o.id === outcomeId);
  return (outcome?.totalBets || 0) / totalBets;
}

/**
 * Potential payout for betting on a specific outcome (parimutuel).
 */
export function multiPotentialPayout(outcomes, outcomeId) {
  const totalBets = outcomes.reduce((sum, o) => sum + (o.totalBets || 0), 0);
  const outcome = outcomes.find((o) => o.id === outcomeId);
  const newTotal = (totalBets + 1) * BET_AMOUNT;
  const winners = (outcome?.totalBets || 0) + 1;
  return newTotal / winners;
}

/**
 * Actual payout for multi-outcome market after resolution.
 */
export function multiCalculatePayout(outcomes, winningOutcomeId) {
  if (winningOutcomeId === "void") return BET_AMOUNT;
  const totalBets = outcomes.reduce((sum, o) => sum + (o.totalBets || 0), 0);
  const totalPool = totalBets * BET_AMOUNT;
  const winner = outcomes.find((o) => o.id === winningOutcomeId);
  if (!winner || winner.totalBets === 0) return 0;
  return totalPool / winner.totalBets;
}

/**
 * Format multi-outcome odds for display.
 */
export function formatMultiOdds(outcomes) {
  const totalBets = outcomes.reduce((sum, o) => sum + (o.totalBets || 0), 0);
  return outcomes.map((o) => ({
    id: o.id,
    label: o.label,
    percent:
      totalBets > 0
        ? Math.round(((o.totalBets || 0) / totalBets) * 100)
        : Math.round(100 / outcomes.length),
    payout: multiPotentialPayout(outcomes, o.id),
    totalBets: o.totalBets || 0,
  }));
}

/**
 * Check if a prediction is binary (open/tagged) vs multi/overunder/conditional.
 */
export function isBinaryPrediction(prediction) {
  return !prediction.type || prediction.type === "open" || prediction.type === "tagged";
}

/**
 * Calculate unrealized value of a bet based on current odds.
 * Returns expected value minus bet cost.
 */
export function unrealizedValue(prediction, betSide) {
  if (!betSide) return 0;

  if (prediction.type === "multi") {
    const totalBets = (prediction.outcomes || []).reduce(
      (sum, o) => sum + (o.totalBets || 0),
      0
    );
    if (totalBets === 0) return 0;
    const outcome = prediction.outcomes?.find((o) => o.id === betSide);
    const prob = (outcome?.totalBets || 0) / totalBets;
    const totalPool = totalBets * BET_AMOUNT;
    const payout = outcome?.totalBets > 0 ? totalPool / outcome.totalBets : 0;
    return prob * payout - BET_AMOUNT;
  }

  // Binary / overunder / conditional
  const prob = impliedProbability(prediction.totalYes, prediction.totalNo);
  const totalPool = (prediction.totalYes + prediction.totalNo) * BET_AMOUNT;
  if (betSide === "yes") {
    const payout = prediction.totalYes > 0 ? totalPool / prediction.totalYes : 0;
    return prob * payout - BET_AMOUNT;
  } else {
    const payout = prediction.totalNo > 0 ? totalPool / prediction.totalNo : 0;
    return (1 - prob) * payout - BET_AMOUNT;
  }
}

// --- Hedging / Multi-Bet Functions ---

/**
 * Calculate net position from an array of user bets on a single prediction.
 * For binary: returns { yesAmount, noAmount, netSide, netAmount }
 * For multi: returns { betsBySide: { [outcomeId]: amount }, totalSpent }
 */
export function calculateNetPosition(userBets) {
  if (!userBets || userBets.length === 0) {
    return { yesAmount: 0, noAmount: 0, netSide: null, netAmount: 0, betsBySide: {}, totalSpent: 0 };
  }

  const betsBySide = {};
  let totalSpent = 0;
  for (const bet of userBets) {
    const amt = bet.amount || BET_AMOUNT;
    betsBySide[bet.side] = (betsBySide[bet.side] || 0) + amt;
    totalSpent += amt;
  }

  const yesAmount = betsBySide["yes"] || 0;
  const noAmount = betsBySide["no"] || 0;

  let netSide = null;
  let netAmount = 0;
  if (yesAmount > noAmount) {
    netSide = "yes";
    netAmount = yesAmount - noAmount;
  } else if (noAmount > yesAmount) {
    netSide = "no";
    netAmount = noAmount - yesAmount;
  }

  return { yesAmount, noAmount, netSide, netAmount, betsBySide, totalSpent };
}

/**
 * Calculate user's share of a pool side.
 */
export function calculatePoolShare(totalSideBets, userBetsOnSide) {
  if (totalSideBets === 0 || userBetsOnSide === 0) return 0;
  return userBetsOnSide / (totalSideBets * BET_AMOUNT);
}

/**
 * Calculate unrealized value across all of a user's bets on a prediction.
 */
export function unrealizedValueMultiBet(prediction, userBets) {
  if (!userBets || userBets.length === 0) return 0;
  return userBets.reduce((sum, bet) => {
    return sum + unrealizedValue(prediction, bet.side);
  }, 0);
}

export { BET_AMOUNT };
