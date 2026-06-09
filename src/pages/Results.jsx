import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import Leaderboard from "../components/Leaderboard";
import PredictionCard from "../components/PredictionCard";
import PersonalityAwards from "../components/PersonalityAwards";
import ShareReceiptButton from "../components/ShareReceiptButton";
import {
  calculatePayout,
  multiCalculatePayout,
  BET_AMOUNT,
} from "../utils/payouts";
import { formatCurrency } from "../utils/helpers";
import { motion } from "framer-motion";

export default function Results({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [balances, setBalances] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", eventId), (snap) => {
      if (snap.exists()) setEvent({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [eventId]);

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

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "balances"),
      (snap) => {
        const bals = [];
        snap.forEach((d) => bals.push({ id: d.id, ...d.data() }));
        setBalances(bals);
      }
    );
    return unsub;
  }, [eventId]);

  useEffect(() => {
    const loadBets = async () => {
      const snap = await getDocs(collection(db, "events", eventId, "bets"));
      const all = [];
      const mine = [];
      snap.forEach((d) => {
        const bet = { id: d.id, ...d.data() };
        all.push(bet);
        if (bet.userId === user.uid) mine.push(bet);
      });
      setAllBets(all);
      setMyBets(mine);
    };
    loadBets();
  }, [eventId, user.uid]);

  const myBalance = balances.find((b) => b.userId === user.uid);
  const sorted = [...balances].sort((a, b) => b.netProfit - a.netProfit);
  const myRank = sorted.findIndex((b) => b.userId === user.uid) + 1;

  const topBets = myBets.slice(0, 4).map((bet) => {
    const pred = predictions.find((p) => p.id === bet.predictionId);
    if (!pred) return { text: "Unknown", won: false, voided: false };
    const voided = pred.resolution === "void";
    let won = false;
    if (pred.type === "multi") {
      won = bet.side === pred.resolution;
    } else {
      won = bet.side === pred.resolution;
    }
    return { text: pred.text, won, voided };
  });

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="text-brand font-semibold text-sm hover:text-ink-soft"
      >
        &larr; Back to Event
      </button>

      {showConfetti && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
        >
          <div className="text-center">
            <motion.p
              className="text-6xl"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6 }}
            >
              {"\uD83C\uDF89"}
            </motion.p>
            <motion.p
              className="text-2xl font-serif italic text-ink mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Results are in!
            </motion.p>
          </div>
        </motion.div>
      )}

      <h2 className="text-2xl font-serif italic text-ink">
        {event?.name} &mdash; Results
      </h2>

      {myBalance && (
        <motion.div
          className="card-editorial-hero p-5 bg-brand text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="mono-label opacity-80">Your final standing</p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-3xl font-extrabold">
                {formatCurrency(myBalance.balance)}
              </p>
              <p className="text-sm opacity-80">
                {myBalance.netProfit >= 0 ? "+" : ""}
                {formatCurrency(myBalance.netProfit)} profit
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold">#{myRank}</p>
              <p className="text-sm opacity-80">
                of {balances.length}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {myBalance && (
        <ShareReceiptButton
          eventName={event?.name}
          userName={user.displayName || "Player"}
          rank={myRank}
          totalPlayers={balances.length}
          netProfit={myBalance.netProfit || 0}
          topBets={topBets}
        />
      )}

      <Leaderboard balances={balances} />

      <PersonalityAwards
        predictions={predictions}
        balances={balances}
        allBets={allBets}
      />

      {myBets.length > 0 && (
        <div>
          <h3 className="font-bold text-ink mb-3">Your Bets</h3>

          {/* Per-prediction summaries when user has multiple bets */}
          {(() => {
            const grouped = {};
            myBets.forEach((bet) => {
              if (!grouped[bet.predictionId]) grouped[bet.predictionId] = [];
              grouped[bet.predictionId].push(bet);
            });
            const multiEntries = Object.entries(grouped).filter(([, bets]) => bets.length > 1);
            if (multiEntries.length === 0) return null;
            return (
              <div className="space-y-2 mb-4">
                <p className="mono-label text-ink-soft">Position Summaries</p>
                {multiEntries.map(([predId, bets]) => {
                  const pred = predictions.find((p) => p.id === predId);
                  if (!pred) return null;
                  const totalSpent = bets.length * BET_AMOUNT;
                  let totalReturn = 0;
                  for (const bet of bets) {
                    const won = bet.side === pred.resolution;
                    const voided = pred.resolution === "void";
                    if (voided) {
                      totalReturn += BET_AMOUNT;
                    } else if (won) {
                      const p = pred.type === "multi"
                        ? multiCalculatePayout(pred.outcomes || [], pred.resolution)
                        : calculatePayout(pred.totalYes, pred.totalNo, pred.resolution);
                      totalReturn += p;
                    }
                  }
                  const net = totalReturn - totalSpent;
                  return (
                    <div key={predId} className={`rounded-xl p-3 border-2 ${net >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                      <p className="text-xs font-medium text-ink-soft mb-1">{pred.text}</p>
                      <p className="text-sm font-bold">
                        {bets.length} bets, {formatCurrency(totalSpent)} wagered{" "}
                        <span className={net >= 0 ? "text-green-600" : "text-red-500"}>
                          {net >= 0 ? "+" : ""}{formatCurrency(net)} net
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="space-y-3">
            {myBets.map((bet, i) => {
              const pred = predictions.find(
                (p) => p.id === bet.predictionId
              );
              if (!pred) return null;

              const isMulti = pred.type === "multi";
              const isOverUnder = pred.type === "overunder";
              const isConditional = pred.type === "conditional";

              let won, voided, payout;
              if (isMulti) {
                voided = pred.resolution === "void";
                won = bet.side === pred.resolution;
                payout = won
                  ? multiCalculatePayout(pred.outcomes || [], pred.resolution)
                  : voided
                  ? BET_AMOUNT
                  : 0;
              } else {
                won = pred.resolution === bet.side;
                voided = pred.resolution === "void";
                if (isConditional && pred.conditionMet === false) voided = true;
                payout = won
                  ? calculatePayout(pred.totalYes, pred.totalNo, pred.resolution)
                  : voided
                  ? BET_AMOUNT
                  : 0;
              }

              let sideLabel = bet.side.toUpperCase();
              if (isMulti && pred.outcomes) {
                const outcome = pred.outcomes.find((o) => o.id === bet.side);
                if (outcome) sideLabel = outcome.label;
              }
              if (isOverUnder) {
                sideLabel = bet.side === "yes" ? "OVER" : "UNDER";
              }

              let statusText;
              if (isConditional && pred.conditionMet === false) {
                statusText = "Condition not met \u2014 Refunded $10";
              } else if (voided) {
                statusText = "Refunded $10";
              } else if (won) {
                statusText = `Won ${formatCurrency(payout)}`;
              } else {
                statusText = `Lost $${BET_AMOUNT}`;
              }

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-xl p-4 border-2 ${
                    voided
                      ? "border-gray-200"
                      : won
                      ? "border-green-300 bg-green-50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <p className="text-sm font-medium text-ink-soft mb-1">
                    {pred.text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        bet.side === "yes"
                          ? "bg-green-100 text-green-700"
                          : bet.side === "no"
                          ? "bg-red-100 text-red-700"
                          : "bg-brand-bg text-brand"
                      }`}
                    >
                      You: {sideLabel}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        voided
                          ? "text-gray-500"
                          : won
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-bold text-ink mb-3">All Predictions</h3>
        <div className="space-y-3">
          {predictions.map((pred, i) => (
            <PredictionCard
              key={pred.id}
              prediction={pred}
              index={i}
              showOdds={true}
              eventId={eventId}
              user={user}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
