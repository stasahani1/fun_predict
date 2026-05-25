import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  increment,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { formatOdds, potentialPayout, BET_AMOUNT } from "../utils/payouts";
import { formatCurrency } from "../utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

export default function BettingView({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [myBets, setMyBets] = useState({});
  const [balance, setBalance] = useState(100);
  const [betting, setBetting] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "predictions"),
      (snap) => {
        const preds = [];
        snap.forEach((d) => preds.push({ id: d.id, ...d.data() }));
        preds.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
        );
        // Open predictions are visible to everyone;
        // Tagged predictions are hidden from tagged members
        const filtered = preds.filter(
          (p) =>
            p.type === "open" ||
            !p.taggedMembers?.some((m) => m.uid === user.uid)
        );
        setPredictions(filtered);
      }
    );
    return unsub;
  }, [eventId, user.uid]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "bets"),
      (snap) => {
        const bets = {};
        snap.forEach((d) => {
          const bet = d.data();
          if (bet.userId === user.uid) {
            bets[bet.predictionId] = bet.side;
          }
        });
        setMyBets(bets);
      }
    );
    return unsub;
  }, [eventId, user.uid]);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "events", eventId, "balances", user.uid),
      (snap) => {
        if (snap.exists()) {
          setBalance(snap.data().balance);
        }
      }
    );
    return unsub;
  }, [eventId, user.uid]);

  const placeBet = async (prediction, side) => {
    if (myBets[prediction.id]) return; // Already bet
    if (balance < BET_AMOUNT) return; // Not enough funds
    setBetting(prediction.id);

    try {
      // Add bet document
      await addDoc(collection(db, "events", eventId, "bets"), {
        predictionId: prediction.id,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        side,
        amount: BET_AMOUNT,
        createdAt: serverTimestamp(),
      });

      // Update prediction totals
      await updateDoc(
        doc(db, "events", eventId, "predictions", prediction.id),
        {
          [side === "yes" ? "totalYes" : "totalNo"]: increment(1),
        }
      );

      // Deduct from balance
      await updateDoc(doc(db, "events", eventId, "balances", user.uid), {
        balance: increment(-BET_AMOUNT),
      });
    } catch (err) {
      console.error("Error placing bet:", err);
      alert("Failed to place bet.");
    } finally {
      setBetting(null);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="text-purple-500 font-semibold text-sm hover:text-purple-700"
      >
        &larr; Back to Event
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-purple-800">
          Place Your Bets
        </h2>
        <div className="bg-purple-100 text-purple-700 font-bold px-4 py-2 rounded-full text-sm">
          Balance: {formatCurrency(balance)}
        </div>
      </div>

      {balance < BET_AMOUNT && (
        <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl">
          You don't have enough funds to place more bets.
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-4">
          {predictions.map((pred, i) => {
            const odds = formatOdds(pred.totalYes, pred.totalNo);
            const alreadyBet = myBets[pred.id];
            const isBetting = betting === pred.id;

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
                  by {pred.creatorName}
                  {pred.taggedMembers?.length > 0 &&
                    ` · feat. ${pred.taggedMembers
                      .map((m) => m.name)
                      .join(", ")}`}
                </p>

                {/* Odds display */}
                <div className="flex gap-2 mb-3 text-center">
                  <div className="flex-1 bg-green-50 rounded-xl py-2">
                    <span className="text-xs text-gray-500">YES</span>
                    <p className="text-lg font-bold text-green-600">
                      {odds.yes}
                    </p>
                    {pred.totalYes + pred.totalNo > 0 && (
                      <span className="text-xs text-gray-400">
                        Win{" "}
                        {formatCurrency(
                          potentialPayout(pred.totalYes, pred.totalNo, "yes")
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 bg-red-50 rounded-xl py-2">
                    <span className="text-xs text-gray-500">NO</span>
                    <p className="text-lg font-bold text-red-500">{odds.no}</p>
                    {pred.totalYes + pred.totalNo > 0 && (
                      <span className="text-xs text-gray-400">
                        Win{" "}
                        {formatCurrency(
                          potentialPayout(pred.totalYes, pred.totalNo, "no")
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bet buttons */}
                {alreadyBet ? (
                  <div
                    className={`text-center py-2 rounded-full text-sm font-bold ${
                      alreadyBet === "yes"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    You bet {alreadyBet.toUpperCase()}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => placeBet(pred, "yes")}
                      disabled={isBetting || balance < BET_AMOUNT}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full disabled:opacity-50 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      {isBetting ? "..." : `YES ($${BET_AMOUNT})`}
                    </motion.button>
                    <motion.button
                      onClick={() => placeBet(pred, "no")}
                      disabled={isBetting || balance < BET_AMOUNT}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-full disabled:opacity-50 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      {isBetting ? "..." : `NO ($${BET_AMOUNT})`}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {predictions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🎯</p>
          <p>No predictions available for you to bet on.</p>
        </div>
      )}
    </div>
  );
}
