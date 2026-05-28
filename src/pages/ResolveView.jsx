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
        snap.forEach((d) => preds.push({ id: d.id, ...d.data() }));
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
      const updateData = { resolution };

      // Over/Under: store actualValue
      if (pred.type === "overunder" && actualValues[pred.id] !== undefined) {
        updateData.actualValue = parseFloat(actualValues[pred.id]);
      }

      // Conditional: store conditionMet
      if (pred.type === "conditional") {
        updateData.conditionMet = resolution !== "void";
      }

      await updateDoc(
        doc(db, "events", eventId, "predictions", pred.id),
        updateData
      );

      // Get all bets for this prediction
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

      // Calculate payout based on type
      let payout;
      if (pred.type === "multi") {
        payout = multiCalculatePayout(pred.outcomes || [], resolution);
      } else {
        payout = calculatePayout(pred.totalYes, pred.totalNo, resolution);
      }

      const batch = writeBatch(db);

      for (const bet of predBets) {
        const balRef = doc(db, "events", eventId, "balances", bet.userId);
        const userDocRef = doc(db, "users", bet.userId);

        let won = false;
        if (pred.type === "multi") {
          won = bet.side === resolution;
        } else {
          won = bet.side === resolution;
        }

        if (resolution === "void") {
          // Refund everyone
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            const current = balSnap.data();
            batch.update(balRef, {
              balance: current.balance + BET_AMOUNT,
            });
          }
        } else if (won) {
          // Winner gets payout
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            const current = balSnap.data();
            batch.update(balRef, {
              balance: current.balance + payout,
              netProfit: current.netProfit + (payout - BET_AMOUNT),
            });
          }
        } else {
          // Loser: record loss in netProfit
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            const current = balSnap.data();
            batch.update(balRef, {
              netProfit: current.netProfit - BET_AMOUNT,
            });
          }
        }

        // Update user gamification stats (Batch 4)
        if (resolution !== "void") {
          try {
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const impliedProb = bet.impliedProbAtBet ?? 0.5;
            const bScore = brierScore(impliedProb, won);
            const prevStreak = userData.currentStreak || 0;
            const prevLongest = userData.longestStreak || 0;
            const newStreak = won ? prevStreak + 1 : 0;

            await setDoc(
              userDocRef,
              {
                displayName: bet.userName || "Anonymous",
                brierScoreSum: (userData.brierScoreSum || 0) + bScore,
                brierScoreCount: (userData.brierScoreCount || 0) + 1,
                currentStreak: newStreak,
                longestStreak: Math.max(prevLongest, newStreak),
                lastBetCorrect: won,
                totalBetsAllTime: (userData.totalBetsAllTime || 0) + 1,
              },
              { merge: true }
            );
          } catch (e) {
            console.error("Error updating user stats:", e);
          }
        }
      }

      await batch.commit();
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
        { resolution: "void", conditionMet: false }
      );
      // Refund all bets
      const betsSnap = await getDocs(
        collection(db, "events", eventId, "bets")
      );
      const batch = writeBatch(db);
      betsSnap.forEach((d) => {
        const bet = d.data();
        if (bet.predictionId === pred.id) {
          const balRef = doc(db, "events", eventId, "balances", bet.userId);
          // We need to read first — done below
        }
      });
      // Re-read and refund
      for (const d of betsSnap.docs) {
        const bet = d.data();
        if (bet.predictionId === pred.id) {
          const balRef = doc(db, "events", eventId, "balances", bet.userId);
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            batch.update(balRef, {
              balance: balSnap.data().balance + BET_AMOUNT,
            });
          }
        }
      }
      await batch.commit();
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
        className="text-purple-500 font-semibold text-sm hover:text-purple-700"
      >
        &larr; Back to Event
      </button>

      <h2 className="text-2xl font-extrabold text-purple-800">
        Resolve Predictions
      </h2>
      <p className="text-gray-500 text-sm">
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
              className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100"
            >
              <p className="text-base font-semibold text-gray-800 mb-1">
                {pred.text}
              </p>

              {isMulti ? (
                <p className="text-xs text-gray-400 mb-3">
                  {(pred.outcomes || []).map((o) => `${o.label}: ${o.totalBets || 0}`).join(" / ")} bets
                </p>
              ) : (
                <p className="text-xs text-gray-400 mb-3">
                  {pred.totalYes} {isOverUnder ? "OVER" : "YES"} / {pred.totalNo}{" "}
                  {isOverUnder ? "UNDER" : "NO"} bets
                </p>
              )}

              {pred.resolutionCriteria && !pred.resolution && (
                <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-3 mb-3">
                  <span className="font-semibold">{"\u2696\uFE0F"} Resolution criteria:</span>{" "}
                  {pred.resolutionCriteria}
                </div>
              )}

              {pred.resolution ? (
                <div
                  className={`text-center py-2 rounded-full text-sm font-bold ${
                    pred.resolution === "yes"
                      ? "bg-green-100 text-green-700"
                      : pred.resolution === "no"
                      ? "bg-red-100 text-red-700"
                      : pred.resolution === "void"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-purple-100 text-purple-700"
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
                  {/* Multi-outcome resolution */}
                  {isMulti && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-purple-700 mb-1">
                        Pick the winning outcome:
                      </p>
                      {(pred.outcomes || []).map((outcome) => (
                        <motion.button
                          key={outcome.id}
                          onClick={() => resolvePrediction(pred, outcome.id)}
                          disabled={isResolving}
                          className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-2 px-4 rounded-xl disabled:opacity-50 text-left text-sm"
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

                  {/* Over/Under resolution */}
                  {isOverUnder && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-purple-700 mb-1">
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
                        className="w-full px-4 py-2 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleOverUnderResolve(pred)}
                          disabled={isResolving || !actualValues[pred.id]}
                          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-xl disabled:opacity-50 text-sm"
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

                  {/* Conditional resolution — two-step */}
                  {isConditional && (
                    <div>
                      {pred.condition && (
                        <div className="bg-blue-50 text-blue-700 text-sm rounded-xl p-3 mb-3">
                          <span className="font-semibold">IF:</span> {pred.condition}
                        </div>
                      )}
                      {conditionSteps[pred.id] !== "met" ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-purple-700">
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
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl disabled:opacity-50 text-sm"
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
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full disabled:opacity-50"
                            whileTap={{ scale: 0.95 }}
                          >
                            {isResolving ? "..." : "Happened"}
                          </motion.button>
                          <motion.button
                            onClick={() => resolvePrediction(pred, "no")}
                            disabled={isResolving}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-full disabled:opacity-50"
                            whileTap={{ scale: 0.95 }}
                          >
                            {isResolving ? "..." : "Didn't happen"}
                          </motion.button>
                          <motion.button
                            onClick={() => resolvePrediction(pred, "void")}
                            disabled={isResolving}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-full disabled:opacity-50"
                            whileTap={{ scale: 0.95 }}
                          >
                            Void
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard binary resolution */}
                  {!isMulti && !isOverUnder && !isConditional && (
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => resolvePrediction(pred, "yes")}
                        disabled={isResolving}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {isResolving ? "..." : "Happened"}
                      </motion.button>
                      <motion.button
                        onClick={() => resolvePrediction(pred, "no")}
                        disabled={isResolving}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-full disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {isResolving ? "..." : "Didn't happen"}
                      </motion.button>
                      <motion.button
                        onClick={() => resolvePrediction(pred, "void")}
                        disabled={isResolving}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-full disabled:opacity-50"
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
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 rounded-full shadow-lg text-lg"
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
