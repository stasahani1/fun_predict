import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  calculatePayout,
  multiCalculatePayout,
  BET_AMOUNT,
} from "../utils/payouts";
import { brierScore } from "../utils/gamification";
import { motion } from "framer-motion";
import { PREDICTION_STATUS } from "../utils/helpers";
import { migrateEventPhase, migratePrediction } from "../utils/migration";

export default function ResolveView({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [resolving, setResolving] = useState(null);
  const [actualValues, setActualValues] = useState({});
  const [conditionSteps, setConditionSteps] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "predictions"),
      (snap) => {
        const preds = [];
        snap.forEach((d) => {
          const raw = { id: d.id, ...d.data() };
          preds.push(migratePrediction(raw, "resolving"));
        });
        preds.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
        );
        setPredictions(preds);
      }
    );
    return unsub;
  }, [eventId]);

  const resolvePrediction = async (pred, resolution) => {
    setResolving(pred.id);
    try {
      const updateData = { resolution, status: "resolved" };

      if (pred.type === "overunder" && actualValues[pred.id] !== undefined) {
        updateData.actualValue = parseFloat(actualValues[pred.id]);
      }

      if (pred.type === "conditional") {
        updateData.conditionMet = resolution !== "void";
      }

      await updateDoc(
        doc(db, "events", eventId, "predictions", pred.id),
        updateData
      );

      const betsSnap = await getDocs(
        collection(db, "events", eventId, "bets")
      );
      const predBets = [];
      betsSnap.forEach((d) => {
        const bet = d.data();
        if (bet.predictionId === pred.id) {
          predBets.push(bet);
        }
      });

      let payoutPerWin;
      if (pred.type === "multi") {
        payoutPerWin = multiCalculatePayout(pred.outcomes || [], resolution);
      } else {
        payoutPerWin = calculatePayout(pred.totalYes, pred.totalNo, resolution);
      }

      // Aggregate payouts per user to avoid stale reads with multiple bets
      const userPayouts = {}; // { [userId]: { balanceDelta, profitDelta, bets: [...] } }
      for (const bet of predBets) {
        if (!userPayouts[bet.userId]) {
          userPayouts[bet.userId] = { balanceDelta: 0, profitDelta: 0, bets: [], userName: bet.userName };
        }
        const entry = userPayouts[bet.userId];
        const won = bet.side === resolution;
        entry.bets.push({ ...bet, won });

        if (resolution === "void") {
          entry.balanceDelta += BET_AMOUNT;
        } else if (won) {
          entry.balanceDelta += payoutPerWin;
          entry.profitDelta += (payoutPerWin - BET_AMOUNT);
        } else {
          entry.profitDelta -= BET_AMOUNT;
        }
      }

      // Write aggregated balance updates in batches (max 400 ops per batch)
      const userIds = Object.keys(userPayouts);
      const MAX_OPS_PER_BATCH = 400;
      for (let start = 0; start < userIds.length; start += MAX_OPS_PER_BATCH) {
        const chunk = userIds.slice(start, start + MAX_OPS_PER_BATCH);
        const batch = writeBatch(db);

        for (const userId of chunk) {
          const { balanceDelta, profitDelta } = userPayouts[userId];
          const balRef = doc(db, "events", eventId, "balances", userId);
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            const current = balSnap.data();
            const updates = {};
            if (balanceDelta !== 0) {
              updates.balance = current.balance + balanceDelta;
            }
            if (profitDelta !== 0) {
              updates.netProfit = (current.netProfit || 0) + profitDelta;
            }
            if (Object.keys(updates).length > 0) {
              batch.update(balRef, updates);
            }
          }
        }

        await batch.commit();
      }

      // Update user stats (outside batch since these are individual doc writes)
      if (resolution !== "void") {
        for (const userId of userIds) {
          const { bets, userName } = userPayouts[userId];
          try {
            const userDocRef = doc(db, "users", userId);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};

            let brierSum = 0;
            let lastWon = false;
            for (const bet of bets) {
              const impliedProb = bet.impliedProbAtBet ?? 0.5;
              brierSum += brierScore(impliedProb, bet.won);
              lastWon = bet.won;
            }

            const prevStreak = userData.currentStreak || 0;
            const prevLongest = userData.longestStreak || 0;
            const newStreak = lastWon ? prevStreak + 1 : 0;

            await setDoc(
              userDocRef,
              {
                displayName: userName || "Anonymous",
                brierScoreSum: (userData.brierScoreSum || 0) + brierSum,
                brierScoreCount: (userData.brierScoreCount || 0) + bets.length,
                currentStreak: newStreak,
                longestStreak: Math.max(prevLongest, newStreak),
                lastBetCorrect: lastWon,
                totalBetsAllTime: (userData.totalBetsAllTime || 0) + bets.length,
              },
              { merge: true }
            );
          } catch (e) {
            console.error("Error updating user stats:", e);
          }
        }
      }
    } catch (err) {
      console.error("Error resolving prediction:", err);
      alert("Failed to resolve. Please try again.");
    } finally {
      setResolving(null);
    }
  };

  const handleOverUnderResolve = (pred) => {
    const actual = parseFloat(actualValues[pred.id]);
    if (isNaN(actual)) return;
    const line = pred.line || 0;
    let resolution;
    if (actual > line) resolution = "yes";
    else if (actual < line) resolution = "no";
    else resolution = "void";
    resolvePrediction(pred, resolution);
  };

  const handleConditionalNotMet = async (pred) => {
    setResolving(pred.id);
    try {
      await updateDoc(
        doc(db, "events", eventId, "predictions", pred.id),
        { resolution: "void", conditionMet: false, status: "resolved" }
      );
      const betsSnap = await getDocs(
        collection(db, "events", eventId, "bets")
      );

      // Aggregate refunds per user
      const userRefunds = {};
      betsSnap.forEach((d) => {
        const bet = d.data();
        if (bet.predictionId === pred.id) {
          userRefunds[bet.userId] = (userRefunds[bet.userId] || 0) + BET_AMOUNT;
        }
      });

      const userIds = Object.keys(userRefunds);
      for (let start = 0; start < userIds.length; start += 400) {
        const chunk = userIds.slice(start, start + 400);
        const batch = writeBatch(db);
        for (const userId of chunk) {
          const balRef = doc(db, "events", eventId, "balances", userId);
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            batch.update(balRef, {
              balance: balSnap.data().balance + userRefunds[userId],
            });
          }
        }
        await batch.commit();
      }
    } catch (err) {
      console.error("Error voiding conditional:", err);
    } finally {
      setResolving(null);
    }
  };

  const allResolved = predictions.every((p) => p.resolution !== null);

  const completeEvent = async () => {
    await updateDoc(doc(db, "events", eventId), { phase: "complete" });
    navigate(`/event/${eventId}/results`);
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="text-brand font-semibold text-sm hover:text-ink-soft"
      >
        &larr; Back to Event
      </button>

      <h2 className="text-2xl font-serif italic text-ink">
        Resolve Predictions
      </h2>
      <p className="text-ink-mute text-sm">
        Mark each prediction as what actually happened.
      </p>

      <div className="space-y-4">
        {predictions.map((pred, i) => {
          const isResolving = resolving === pred.id;
          const isMulti = pred.type === "multi";
          const isOverUnder = pred.type === "overunder";
          const isConditional = pred.type === "conditional";

          return (
            <motion.div
              key={pred.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card-editorial p-5"
            >
              <div className="flex items-center gap-2 mb-1">
                <p className="text-base font-semibold text-ink">
                  {pred.text}
                </p>
                {pred.status && PREDICTION_STATUS[pred.status] && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PREDICTION_STATUS[pred.status].color}`}>
                    {PREDICTION_STATUS[pred.status].label}
                  </span>
                )}
              </div>

              {isMulti ? (
                <p className="text-xs text-ink-mute mb-3">
                  {(pred.outcomes || []).map((o) => `${o.label}: ${o.totalBets || 0}`).join(" / ")} bets
                </p>
              ) : (
                <p className="text-xs text-ink-mute mb-3">
                  {pred.totalYes} {isOverUnder ? "OVER" : "YES"} / {pred.totalNo}{" "}
                  {isOverUnder ? "UNDER" : "NO"} bets
                </p>
              )}

              {pred.resolutionCriteria && !pred.resolution && (
                <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-3 mb-3 border border-yellow-200">
                  <span className="font-semibold">{"\u2696\uFE0F"} Resolution criteria:</span>{" "}
                  {pred.resolutionCriteria}
                </div>
              )}

              {pred.resolution ? (
                <div
                  className={`text-center py-2 rounded-xl text-sm font-bold border-2 ${
                    pred.resolution === "yes"
                      ? "bg-green-100 text-green-700 border-green-300"
                      : pred.resolution === "no"
                      ? "bg-red-100 text-red-700 border-red-300"
                      : pred.resolution === "void"
                      ? "bg-gray-100 text-gray-500 border-gray-300"
                      : "bg-brand-bg text-brand border-rule-dark"
                  }`}
                >
                  {(() => {
                    if (isMulti) {
                      if (pred.resolution === "void") return "Voided";
                      const winner = (pred.outcomes || []).find(
                        (o) => o.id === pred.resolution
                      );
                      return `Winner: ${winner?.label || pred.resolution}`;
                    }
                    if (isOverUnder) {
                      if (pred.resolution === "void") return "Voided (Push)";
                      return pred.resolution === "yes"
                        ? `OVER (Actual: ${pred.actualValue})`
                        : `UNDER (Actual: ${pred.actualValue})`;
                    }
                    if (isConditional && pred.conditionMet === false) {
                      return "Voided — Condition not met";
                    }
                    return pred.resolution === "yes"
                      ? "Happened"
                      : pred.resolution === "no"
                      ? "Didn't happen"
                      : "Voided";
                  })()}
                </div>
              ) : (
                <>
                  {isMulti && (
                    <div className="space-y-2">
                      <p className="mono-label text-ink-soft mb-1">
                        Pick the winning outcome:
                      </p>
                      {(pred.outcomes || []).map((outcome) => (
                        <motion.button
                          key={outcome.id}
                          onClick={() => resolvePrediction(pred, outcome.id)}
                          disabled={isResolving}
                          className="w-full bg-brand-bg hover:bg-brand-soft text-brand font-bold py-2 px-4 rounded-xl disabled:opacity-50 text-left text-sm border border-rule-dark"
                          whileTap={{ scale: 0.98 }}
                        >
                          {isResolving ? "..." : outcome.label}
                        </motion.button>
                      ))}
                      <motion.button
                        onClick={() => resolvePrediction(pred, "void")}
                        disabled={isResolving}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-xl disabled:opacity-50 text-sm"
                        whileTap={{ scale: 0.95 }}
                      >
                        Void
                      </motion.button>
                    </div>
                  )}

                  {isOverUnder && (
                    <div className="space-y-2">
                      <p className="mono-label text-ink-soft mb-1">
                        Line: {pred.line} {pred.unit}
                      </p>
                      <input
                        type="number"
                        value={actualValues[pred.id] || ""}
                        onChange={(e) =>
                          setActualValues((prev) => ({
                            ...prev,
                            [pred.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter actual value"
                        step="0.5"
                        className="w-full px-4 py-2 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleOverUnderResolve(pred)}
                          disabled={isResolving || !actualValues[pred.id]}
                          className="flex-1 bg-brand hover:bg-brand/90 text-white font-bold py-2 rounded-xl border-2 border-ink disabled:opacity-50 text-sm"
                          whileTap={{ scale: 0.95 }}
                        >
                          {isResolving ? "..." : "Resolve"}
                        </motion.button>
                        <motion.button
                          onClick={() => resolvePrediction(pred, "void")}
                          disabled={isResolving}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-xl disabled:opacity-50 text-sm"
                          whileTap={{ scale: 0.95 }}
                        >
                          Void
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {isConditional && (
                    <div>
                      {pred.condition && (
                        <div className="bg-blue-100 text-blue-700 text-sm rounded-xl p-3 mb-3 border border-blue-200">
                          <span className="font-semibold">IF:</span> {pred.condition}
                        </div>
                      )}
                      {conditionSteps[pred.id] !== "met" ? (
                        <div className="space-y-2">
                          <p className="mono-label text-ink-soft">
                            Was the condition met?
                          </p>
                          <div className="flex gap-2">
                            <motion.button
                              onClick={() =>
                                setConditionSteps((prev) => ({
                                  ...prev,
                                  [pred.id]: "met",
                                }))
                              }
                              disabled={isResolving}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl border-2 border-ink disabled:opacity-50 text-sm"
                              whileTap={{ scale: 0.95 }}
                            >
                              Yes, condition met
                            </motion.button>
                            <motion.button
                              onClick={() => handleConditionalNotMet(pred)}
                              disabled={isResolving}
                              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 rounded-xl disabled:opacity-50 text-sm"
                              whileTap={{ scale: 0.95 }}
                            >
                              {isResolving ? "..." : "No — Void all"}
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => resolvePrediction(pred, "yes")}
                            disabled={isResolving}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50"
                            whileTap={{ scale: 0.95 }}
                          >
                            {isResolving ? "..." : "Happened"}
                          </motion.button>
                          <motion.button
                            onClick={() => resolvePrediction(pred, "no")}
                            disabled={isResolving}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50"
                            whileTap={{ scale: 0.95 }}
                          >
                            {isResolving ? "..." : "Didn't happen"}
                          </motion.button>
                          <motion.button
                            onClick={() => resolvePrediction(pred, "void")}
                            disabled={isResolving}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-xl disabled:opacity-50"
                            whileTap={{ scale: 0.95 }}
                          >
                            Void
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}

                  {!isMulti && !isOverUnder && !isConditional && (
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => resolvePrediction(pred, "yes")}
                        disabled={isResolving}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {isResolving ? "..." : "Happened"}
                      </motion.button>
                      <motion.button
                        onClick={() => resolvePrediction(pred, "no")}
                        disabled={isResolving}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {isResolving ? "..." : "Didn't happen"}
                      </motion.button>
                      <motion.button
                        onClick={() => resolvePrediction(pred, "void")}
                        disabled={isResolving}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-xl disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        Void
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {allResolved && predictions.length > 0 && (
        <motion.button
          onClick={completeEvent}
          className="w-full bg-green-500 text-white font-bold py-4 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410] text-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Finalize &amp; Show Results
        </motion.button>
      )}
    </div>
  );
}
