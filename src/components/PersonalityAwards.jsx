import { motion } from "framer-motion";
import { brierScore } from "../utils/gamification";

function computeAwards(predictions, balances, allBets) {
  const awards = [];

  // Track per-user stats
  const userStats = {};
  const userBrierScores = {};

  for (const bet of allBets) {
    if (!userStats[bet.userId]) {
      userStats[bet.userId] = {
        name: bet.userName,
        correct: 0,
        total: 0,
        contrarian: 0,
      };
      userBrierScores[bet.userId] = [];
    }
    const pred = predictions.find((p) => p.id === bet.predictionId);
    if (!pred || !pred.resolution || pred.resolution === "void") continue;

    userStats[bet.userId].total++;

    // Determine if bet won
    let won = false;
    if (pred.type === "multi") {
      won = bet.side === pred.resolution;
    } else {
      won = bet.side === pred.resolution;
    }

    if (won) {
      userStats[bet.userId].correct++;
    }

    // Brier score calculation
    const impliedProb = bet.impliedProbAtBet ?? 0.5;
    userBrierScores[bet.userId].push(brierScore(impliedProb, won));

    // Contrarian: bet against the majority
    if (pred.type === "multi") {
      // For multi, contrarian = bet on outcome with below-average bets
      const outcomes = pred.outcomes || [];
      const totalBets = outcomes.reduce((s, o) => s + (o.totalBets || 0), 0);
      const avgBets = totalBets / outcomes.length;
      const betOutcome = outcomes.find((o) => o.id === bet.side);
      if (betOutcome && (betOutcome.totalBets || 0) < avgBets) {
        userStats[bet.userId].contrarian++;
      }
    } else {
      const majorityYes = pred.totalYes > pred.totalNo;
      const majorityNo = pred.totalNo > pred.totalYes;
      if (
        (majorityYes && bet.side === "no") ||
        (majorityNo && bet.side === "yes")
      ) {
        userStats[bet.userId].contrarian++;
      }
    }
  }

  // Oracle — highest accuracy (min 2 bets)
  let bestAccuracy = { name: null, rate: 0 };
  let worstAccuracy = { name: null, rate: 1 };
  let mostContrarian = { name: null, count: 0 };

  for (const [, stats] of Object.entries(userStats)) {
    if (stats.total < 2) continue;
    const rate = stats.correct / stats.total;
    if (rate > bestAccuracy.rate || !bestAccuracy.name) {
      bestAccuracy = { name: stats.name, rate };
    }
    if (rate < worstAccuracy.rate || !worstAccuracy.name) {
      worstAccuracy = { name: stats.name, rate };
    }
    if (stats.contrarian > mostContrarian.count) {
      mostContrarian = { name: stats.name, count: stats.contrarian };
    }
  }

  if (bestAccuracy.name) {
    awards.push({
      emoji: "\uD83D\uDD2E",
      title: "Oracle",
      recipient: bestAccuracy.name,
      stat: `${Math.round(bestAccuracy.rate * 100)}% accuracy`,
    });
  }

  // Most Predicted About — most tagged predictions
  const taggedCounts = {};
  for (const pred of predictions) {
    if (pred.taggedMembers) {
      for (const m of pred.taggedMembers) {
        taggedCounts[m.name] = (taggedCounts[m.name] || 0) + 1;
      }
    }
  }
  const mostTagged = Object.entries(taggedCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (mostTagged) {
    awards.push({
      emoji: "\uD83C\uDFAF",
      title: "Most Predicted About",
      recipient: mostTagged[0],
      stat: `${mostTagged[1]} prediction${mostTagged[1] !== 1 ? "s" : ""}`,
    });
  }

  // Degen — most contrarian bets
  if (mostContrarian.name) {
    awards.push({
      emoji: "\uD83C\uDFB0",
      title: "Degen",
      recipient: mostContrarian.name,
      stat: `${mostContrarian.count} contrarian bet${mostContrarian.count !== 1 ? "s" : ""}`,
    });
  }

  // Big Winner — highest net profit
  const sorted = [...balances].sort((a, b) => b.netProfit - a.netProfit);
  if (sorted.length > 0 && sorted[0].netProfit > 0) {
    awards.push({
      emoji: "\uD83D\uDCB0",
      title: "Big Winner",
      recipient: sorted[0].userName,
      stat: `+$${sorted[0].netProfit.toFixed(2)} profit`,
    });
  }

  // Consistently Wrong — lowest accuracy (min 2 bets, and different from Oracle)
  if (worstAccuracy.name && worstAccuracy.name !== bestAccuracy.name) {
    awards.push({
      emoji: "\uD83E\uDD21",
      title: "Consistently Wrong",
      recipient: worstAccuracy.name,
      stat: `${Math.round(worstAccuracy.rate * 100)}% accuracy`,
    });
  }

  // Calibration King — best per-event Brier score (Batch 4)
  let bestBrier = { name: null, score: 1 };
  for (const [userId, scores] of Object.entries(userBrierScores)) {
    if (scores.length < 2) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < bestBrier.score || !bestBrier.name) {
      bestBrier = { name: userStats[userId]?.name, score: avg };
    }
  }
  if (bestBrier.name) {
    awards.push({
      emoji: "\uD83D\uDCCF",
      title: "Calibration King",
      recipient: bestBrier.name,
      stat: `Brier: ${bestBrier.score.toFixed(3)}`,
    });
  }

  return awards;
}

export default function PersonalityAwards({ predictions, balances, allBets }) {
  const awards = computeAwards(predictions, balances, allBets);

  if (awards.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
      <h3 className="font-bold text-purple-800 mb-3">
        {"\uD83C\uDFC6"} Personality Awards
      </h3>
      <div className="space-y-2">
        {awards.map((award, i) => (
          <motion.div
            key={award.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50"
          >
            <span className="text-2xl">{award.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-700">
                {award.title}
              </p>
              <p className="text-xs text-gray-500">
                {award.recipient} &middot; {award.stat}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
