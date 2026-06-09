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
  potentialPayout,
  multiPotentialPayout,
} from "../utils/payouts";
import { formatCurrency, PREDICTION_CATEGORIES, PREDICTION_STATUS } from "../utils/helpers";
import { migratePrediction } from "../utils/migration";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedNumber from "../components/AnimatedNumber";
import MultiOutcomeOdds from "../components/MultiOutcomeOdds";
import OverUnderOdds from "../components/OverUnderOdds";
import ConditionalBadge from "../components/ConditionalBadge";
import BetConfirmModal from "../components/BetConfirmModal";
import NetPositionDisplay from "../components/NetPositionDisplay";

export default function BettingView({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  // myBets: { [predId]: [{ side, amount, id }, ...] }
  const [myBets, setMyBets] = useState({});
  const [allBets, setAllBets] = useState({});
  const [balance, setBalance] = useState(100);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Individual confirm flow
  const [confirmingBet, setConfirmingBet] = useState(null); // { predictionId, side }
  const [submittingBet, setSubmittingBet] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "predictions"),
      (snap) => {
        const preds = [];
        snap.forEach((d) => {
          const raw = { id: d.id, ...d.data() };
          preds.push(migratePrediction(raw, "active"));
        });
        preds.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
        );
        const filtered = preds.filter((p) => {
          // Hide from tagged users who can't see it yet
          const isTagged = p.taggedMembers?.some((m) => m.uid === user.uid);
          if (isTagged && p.visibleToTagged === false && !p.resolution) return false;
          // Original filter: hide tagged predictions from tagged users (they can't bet)
          return (
            p.type === "open" ||
            p.type === "multi" ||
            p.type === "overunder" ||
            p.type === "conditional" ||
            p.creatorId === user.uid ||
            !isTagged
          );
        });
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
          const bet = { id: d.id, ...d.data() };
          if (bet.userId === user.uid) {
            if (!mine[bet.predictionId]) mine[bet.predictionId] = [];
            mine[bet.predictionId].push({ side: bet.side, amount: bet.amount || BET_AMOUNT, id: d.id });
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

  const openConfirmModal = (predictionId, side) => {
    setConfirmingBet({ predictionId, side });
  };

  const confirmBet = async () => {
    if (!confirmingBet) return;
    const { predictionId, side } = confirmingBet;
    const prediction = predictions.find((p) => p.id === predictionId);
    if (!prediction) return;

    if (balance < BET_AMOUNT) {
      alert("Not enough balance to place this bet.");
      return;
    }

    setSubmittingBet(true);
    try {
      let impliedProbAtBet = 0.5;
      if (prediction.type === "multi") {
        impliedProbAtBet = multiImpliedProbability(prediction.outcomes || [], side);
      } else {
        const prob = impliedProbability(prediction.totalYes, prediction.totalNo);
        impliedProbAtBet = side === "yes" ? prob : 1 - prob;
      }

      await addDoc(collection(db, "events", eventId, "bets"), {
        predictionId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        side,
        amount: BET_AMOUNT,
        impliedProbAtBet,
        createdAt: serverTimestamp(),
      });

      if (prediction.type === "multi") {
        const predRef = doc(db, "events", eventId, "predictions", predictionId);
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
          doc(db, "events", eventId, "predictions", predictionId),
          {
            [side === "yes" ? "totalYes" : "totalNo"]: increment(1),
          }
        );
      }

      await updateDoc(doc(db, "events", eventId, "balances", user.uid), {
        balance: increment(-BET_AMOUNT),
      });

      setConfirmingBet(null);
    } catch (err) {
      console.error("Error placing bet:", err);
      alert("Failed to place bet.");
    } finally {
      setSubmittingBet(false);
    }
  };

  // Get info for the confirmation modal
  const confirmPrediction = confirmingBet
    ? predictions.find((p) => p.id === confirmingBet.predictionId)
    : null;

  let modalImpliedProb = null;
  let modalEstPayout = null;
  let modalPoolSharePct = null;
  if (confirmPrediction && confirmingBet) {
    const { side } = confirmingBet;
    if (confirmPrediction.type === "multi") {
      modalImpliedProb = multiImpliedProbability(confirmPrediction.outcomes || [], side);
      modalEstPayout = multiPotentialPayout(confirmPrediction.outcomes || [], side);
      const outcome = confirmPrediction.outcomes?.find((o) => o.id === side);
      const sideBets = (outcome?.totalBets || 0) + 1;
      modalPoolSharePct = 1 / sideBets;
    } else {
      const prob = impliedProbability(confirmPrediction.totalYes, confirmPrediction.totalNo);
      modalImpliedProb = side === "yes" ? prob : 1 - prob;
      modalEstPayout = potentialPayout(confirmPrediction.totalYes, confirmPrediction.totalNo, side);
      const sideBets = side === "yes" ? confirmPrediction.totalYes + 1 : confirmPrediction.totalNo + 1;
      modalPoolSharePct = 1 / sideBets;
    }
  }

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
            const isLocked = pred.status === "locked" || pred.status === "resolved";
            const isBlind = pred.blindMode && !pred.resolution;
            const myPredBets = myBets[pred.id] || [];
            const hasBets = myPredBets.length > 0;
            const canBet = !isLocked && balance >= BET_AMOUNT;
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
                  {pred.status && PREDICTION_STATUS[pred.status] && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PREDICTION_STATUS[pred.status].color}`}>
                      {PREDICTION_STATUS[pred.status].label}
                    </span>
                  )}
                  {isBlind && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-white">
                      Blind
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

                {/* Net position display for hedging */}
                {hasBets && (
                  <NetPositionDisplay bets={myPredBets} prediction={pred} />
                )}

                {isMulti && pred.outcomes && (
                  <div className="mb-3">
                    <MultiOutcomeOdds
                      outcomes={pred.outcomes}
                      onBet={canBet ? (outcomeId) => openConfirmModal(pred.id, outcomeId) : undefined}
                      blind={isBlind}
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
                      onBet={canBet ? (side) => openConfirmModal(pred.id, side) : undefined}
                      readOnly={isLocked}
                      blind={isBlind}
                    />
                  </div>
                )}

                {(isBinary || isConditional) && dualOdds && !isBlind && (
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
                        $10 {"\u2192"} ~<AnimatedNumber value={dualOdds.yes.payout} format="currency" className="text-xs" /> (est.)
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
                        $10 {"\u2192"} ~<AnimatedNumber value={dualOdds.no.payout} format="currency" className="text-xs" /> (est.)
                      </p>
                    </div>
                  </div>
                )}

                {(isBinary || isConditional) && isBlind && (
                  <div className="flex gap-2 mb-3 text-center">
                    <div className="flex-1 bg-green-50 rounded-xl py-2">
                      <span className="mono-label text-ink-mute">YES</span>
                      <p className="text-2xl font-extrabold text-green-600">??</p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl py-2">
                      <span className="mono-label text-ink-mute">NO</span>
                      <p className="text-2xl font-extrabold text-red-500">??</p>
                    </div>
                  </div>
                )}

                {predBets.length > 0 && !isBlind && (
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
                    {isLocked ? (
                      <div className="text-center py-2 rounded-xl text-sm font-bold border-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                        Betting closed
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => openConfirmModal(pred.id, "yes")}
                          disabled={balance < BET_AMOUNT}
                          className="flex-1 font-bold py-3 rounded-xl border-2 transition-colors bg-green-500 hover:bg-green-600 text-white border-ink disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
                        >
                          {hasBets ? "YES (Hedge)" : `YES ($${BET_AMOUNT})`}
                        </motion.button>
                        <motion.button
                          onClick={() => openConfirmModal(pred.id, "no")}
                          disabled={balance < BET_AMOUNT}
                          className="flex-1 font-bold py-3 rounded-xl border-2 transition-colors bg-red-500 hover:bg-red-600 text-white border-ink disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
                        >
                          {hasBets ? "NO (Hedge)" : `NO ($${BET_AMOUNT})`}
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

      {/* Bet confirmation modal */}
      <BetConfirmModal
        open={!!confirmingBet}
        prediction={confirmPrediction}
        side={confirmingBet?.side}
        balance={balance}
        estimatedPayout={modalEstPayout}
        impliedProb={modalImpliedProb}
        poolSharePct={modalPoolSharePct}
        onConfirm={confirmBet}
        onCancel={() => setConfirmingBet(null)}
        submitting={submittingBet}
        blind={confirmPrediction?.blindMode && !confirmPrediction?.resolution}
      />
    </div>
  );
}
