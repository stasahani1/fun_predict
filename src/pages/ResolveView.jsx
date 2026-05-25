import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { calculatePayout, BET_AMOUNT } from "../utils/payouts";
import { motion } from "framer-motion";

export default function ResolveView({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [resolving, setResolving] = useState(null);

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
      // Update prediction resolution
      await updateDoc(
        doc(db, "events", eventId, "predictions", pred.id),
        { resolution }
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

      // Calculate and apply payouts
      const payout = calculatePayout(pred.totalYes, pred.totalNo, resolution);
      const batch = writeBatch(db);

      for (const bet of predBets) {
        const balRef = doc(db, "events", eventId, "balances", bet.userId);

        if (resolution === "void") {
          // Refund everyone
          const balSnap = await getDoc(balRef);
          if (balSnap.exists()) {
            const current = balSnap.data();
            batch.update(balRef, {
              balance: current.balance + BET_AMOUNT,
            });
          }
        } else if (bet.side === resolution) {
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
      }

      await batch.commit();
    } catch (err) {
      console.error("Error resolving prediction:", err);
      alert("Failed to resolve. Please try again.");
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
              <p className="text-xs text-gray-400 mb-3">
                {pred.totalYes} YES / {pred.totalNo} NO bets
              </p>

              {pred.resolution ? (
                <div
                  className={`text-center py-2 rounded-full text-sm font-bold ${
                    pred.resolution === "yes"
                      ? "bg-green-100 text-green-700"
                      : pred.resolution === "no"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Resolved:{" "}
                  {pred.resolution === "yes"
                    ? "Happened"
                    : pred.resolution === "no"
                    ? "Didn't happen"
                    : "Voided"}
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
