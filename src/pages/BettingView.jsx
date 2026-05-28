import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  formatDualOdds,
  BET_AMOUNT,
  isBinaryPrediction,
  impliedProbability,
  multiImpliedProbability,
} from "../utils/payouts";
import { formatCurrency, PREDICTION_CATEGORIES } from "../utils/helpers";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedNumber from "../components/AnimatedNumber";
import MultiOutcomeOdds from "../components/MultiOutcomeOdds";
import OverUnderOdds from "../components/OverUnderOdds";
import ConditionalBadge from "../components/ConditionalBadge";

export default function BettingView({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [myBets, setMyBets] = useState({});
  const [allBets, setAllBets] = useState({});
  const [balance, setBalance] = useState(100);
  const [betting, setBetting] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "predictions"),
      (snap) => {
        const preds = [];
        snap.forEach((d) => preds.push({ id: d.id, ...d.data() }));
        preds.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
        );
        const filtered = preds.filter(
          (p) =>
            p.type === "open" ||
            p.type === "multi" ||
            p.type === "overunder" ||
            p.type === "conditional" ||
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
        const mine = {};
        const grouped = {};
        snap.forEach((d) => {
          const bet = d.data();
          if (bet.userId === user.uid) {
            mine[bet.predictionId] = bet.side;
          }
          if (!grouped[bet.predictionId]) grouped[bet.predictionId] = [];
          grouped[bet.predictionId].push(bet);
        });
        setMyBets(mine);
        setAllBets(grouped);
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
    if (myBets[prediction.id]) return;
    if (balance < BET_AMOUNT) return;
    setBetting(prediction.id);

    try {
      let impliedProbAtBet = 0.5;
      if (prediction.type === "multi") {
        const outcomes = prediction.outcomes || [];
        impliedProbAtBet = multiImpliedProbability(outcomes, side);
      } else {
        const prob = impliedProbability(prediction.totalYes, prediction.totalNo);
        impliedProbAtBet = side === "yes" ? prob : 1 - prob;
      }

      await addDoc(collection(db, "events", eventId, "bets"), {
        predictionId: prediction.id,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        side,
        amount: BET_AMOUNT,
        impliedProbAtBet,
        createdAt: serverTimestamp(),
      });

      if (prediction.type === "multi") {
        const predRef = doc(db, "events", eventId, "predictions", prediction.id);
        await runTransaction(db, async (transaction) => {
          const predDoc = await transaction.get(predRef);
          if (!predDoc.exists()) return;
          const data = predDoc.data();
          const updatedOutcomes = (data.outcomes || []).map((o) =>
            o.id === side ? { ...o, totalBets: (o.totalBets || 0) + 1 } : o
          );
          transaction.update(predRef, { outcomes: updatedOutcomes });
        });
      } else {
        await updateDoc(
          doc(db, "events", eventId, "predictions", prediction.id),
          {
            [side === "yes" ? "totalYes" : "totalNo"]: increment(1),
          }
        );
      }

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
        className="text-brand font-semibold text-sm hover:text-ink-soft"
      >
        &larr; Back to Event
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif italic text-ink">
          Place Your Bets
        </h2>
        <div className="bg-brand-bg text-brand font-bold px-4 py-2 rounded-full mono-label">
          Balance: {formatCurrency(balance)}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            categoryFilter === "all"
              ? "bg-brand text-white"
              : "bg-cream text-ink-mute hover:bg-cream-dark"
          }`}
        >
          All
        </button>
        {PREDICTION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat.id
                ? cat.color + " ring-2 ring-offset-1 ring-brand"
                : "bg-cream text-ink-mute hover:bg-cream-dark"
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {balance < BET_AMOUNT && (
        <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-200">
          You don't have enough funds to place more bets.
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-4">
          {predictions
            .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
            .map((pred, i) => {
            const isMulti = pred.type === "multi";
            const isOverUnder = pred.type === "overunder";
            const isConditional = pred.type === "conditional";
            const isBinary = isBinaryPrediction(pred);
            const dualOdds = (isBinary || isConditional) ? formatDualOdds(pred.totalYes, pred.totalNo) : null;
            const alreadyBet = myBets[pred.id];
            const isBetting = betting === pred.id;
            const predBets = allBets[pred.id] || [];
            const categoryObj = PREDICTION_CATEGORIES.find((c) => c.id === pred.category);

            return (
              <motion.div
                key={pred.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card-editorial p-5"
              >
                <p className="text-base font-semibold text-ink mb-1">
                  {pred.text}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-ink-mute">
                    by {pred.creatorName}
                  </span>
                  {categoryObj && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryObj.color}`}>
                      {categoryObj.emoji} {categoryObj.label}
                    </span>
                  )}
                  {pred.taggedMembers?.length > 0 && (
                    <span className="text-xs bg-brand-bg text-brand px-2 py-0.5 rounded-full">
                      feat. {pred.taggedMembers.map((m) => m.name).join(", ")}
                    </span>
                  )}
                  {pred.type && !isBinary && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {pred.type === "multi" ? "Multi" : pred.type === "overunder" ? "O/U" : "Cond."}
                    </span>
                  )}
                </div>
                {pred.resolutionCriteria && (
                  <p className="text-xs text-ink-mute italic mb-3">
                    {"\u2696\uFE0F"} {pred.resolutionCriteria}
                  </p>
                )}

                {isConditional && pred.condition && (
                  <ConditionalBadge
                    condition={pred.condition}
                    conditionMet={pred.conditionMet}
                  />
                )}

                {isMulti && pred.outcomes && (
                  <div className="mb-3">
                    <MultiOutcomeOdds
                      outcomes={pred.outcomes}
                      onBet={alreadyBet ? undefined : (outcomeId) => placeBet(pred, outcomeId)}
                      userBet={alreadyBet}
                      betting={isBetting}
                    />
                  </div>
                )}

                {isOverUnder && (
                  <div className="mb-3">
                    <OverUnderOdds
                      line={pred.line}
                      unit={pred.unit}
                      totalYes={pred.totalYes}
                      totalNo={pred.totalNo}
                      actualValue={pred.actualValue}
                      onBet={alreadyBet ? undefined : (side) => placeBet(pred, side)}
                      userBet={alreadyBet}
                      betting={isBetting}
                    />
                  </div>
                )}

                {(isBinary || isConditional) && dualOdds && (
                  <div className="flex gap-2 mb-3 text-center">
                    <div className="flex-1 bg-green-50 rounded-xl py-2">
                      <span className="mono-label text-ink-mute">YES</span>
                      <p>
                        <AnimatedNumber
                          value={dualOdds.yes.percent}
                          format="percent"
                          className="text-2xl font-extrabold text-green-600"
                        />
                      </p>
                      <p className="text-xs text-ink-mute">
                        $10 {"\u2192"} <AnimatedNumber value={dualOdds.yes.payout} format="currency" className="text-xs" />
                      </p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl py-2">
                      <span className="mono-label text-ink-mute">NO</span>
                      <p>
                        <AnimatedNumber
                          value={dualOdds.no.percent}
                          format="percent"
                          className="text-2xl font-extrabold text-red-500"
                        />
                      </p>
                      <p className="text-xs text-ink-mute">
                        $10 {"\u2192"} <AnimatedNumber value={dualOdds.no.payout} format="currency" className="text-xs" />
                      </p>
                    </div>
                  </div>
                )}

                {predBets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {predBets.slice(0, 5).map((bet, j) => {
                      let sideLabel = bet.side.toUpperCase();
                      if (isMulti && pred.outcomes) {
                        const outcome = pred.outcomes.find((o) => o.id === bet.side);
                        if (outcome) sideLabel = outcome.label;
                      }
                      if (isOverUnder) {
                        sideLabel = bet.side === "yes" ? "OVER" : "UNDER";
                      }
                      return (
                        <span
                          key={j}
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            bet.side === "yes"
                              ? "bg-green-100 text-green-700"
                              : bet.side === "no"
                              ? "bg-red-100 text-red-700"
                              : "bg-brand-bg text-brand"
                          }`}
                        >
                          {bet.userName?.split(" ")[0]}: {sideLabel}
                        </span>
                      );
                    })}
                    {predBets.length > 5 && (
                      <span className="text-xs text-ink-mute px-2 py-0.5">
                        +{predBets.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {(isBinary || isConditional) && !isMulti && !isOverUnder && (
                  <>
                    {alreadyBet ? (
                      <div
                        className={`text-center py-2 rounded-xl text-sm font-bold border-2 ${
                          alreadyBet === "yes"
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-red-100 text-red-700 border-red-300"
                        }`}
                      >
                        You bet {alreadyBet.toUpperCase()}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => placeBet(pred, "yes")}
                          disabled={isBetting || balance < BET_AMOUNT}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50 transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          {isBetting ? "..." : `YES ($${BET_AMOUNT})`}
                        </motion.button>
                        <motion.button
                          onClick={() => placeBet(pred, "no")}
                          disabled={isBetting || balance < BET_AMOUNT}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50 transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          {isBetting ? "..." : `NO ($${BET_AMOUNT})`}
                        </motion.button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {predictions.length === 0 && (
        <div className="text-center py-12 text-ink-mute">
          <p className="text-4xl mb-2">{"\uD83C\uDFAF"}</p>
          <p>No predictions available for you to bet on.</p>
        </div>
      )}
    </div>
  );
}
