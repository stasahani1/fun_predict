import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { formatDualOdds, BET_AMOUNT, unrealizedValue } from "../utils/payouts";
import { formatCurrency } from "../utils/helpers";
import { motion } from "framer-motion";
import AnimatedNumber from "../components/AnimatedNumber";
import MultiOutcomeOdds from "../components/MultiOutcomeOdds";
import OverUnderOdds from "../components/OverUnderOdds";
import ConditionalBadge from "../components/ConditionalBadge";

export default function SweatView({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [myBets, setMyBets] = useState({});
  const [allBets, setAllBets] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [event, setEvent] = useState(null);

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
        preds.sort((a, b) => (b.totalYes + b.totalNo) - (a.totalYes + a.totalNo));
        setPredictions(preds);
      }
    );
    return unsub;
  }, [eventId]);

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
    const writePresence = () => {
      setDoc(doc(db, "events", eventId, "presence", user.uid), {
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL || null,
        lastSeen: serverTimestamp(),
      });
    };
    writePresence();
    const interval = setInterval(writePresence, 30000);
    return () => clearInterval(interval);
  }, [eventId, user.uid, user.displayName, user.photoURL]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "presence"),
      (snap) => {
        const now = Date.now();
        const users = [];
        snap.forEach((d) => {
          const data = d.data();
          const lastSeen = data.lastSeen?.toMillis?.() || 0;
          if (now - lastSeen < 60000) {
            users.push(data);
          }
        });
        setOnlineUsers(users);
      }
    );
    return unsub;
  }, [eventId]);

  const myBetPredictions = predictions.filter((p) => myBets[p.id]);
  const netPosition = myBetPredictions.reduce((sum, pred) => {
    return sum + unrealizedValue(pred, myBets[pred.id]);
  }, 0);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="text-brand font-semibold text-sm hover:text-ink-soft"
      >
        &larr; Back to Event
      </button>

      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-serif italic text-ink">Live View</h2>
        <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      </div>

      {/* Your Position Hero Card */}
      <motion.div
        className="card-editorial-hero p-5 bg-brand text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="mono-label opacity-80">Your Position</p>
        <p className="text-3xl font-extrabold mt-1">
          {netPosition >= 0 ? "+" : ""}
          {formatCurrency(netPosition)}
        </p>
        <p className="text-sm opacity-80 mt-1">
          Unrealized value across {myBetPredictions.length} bet
          {myBetPredictions.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Who's Online */}
      {onlineUsers.length > 0 && (
        <div className="card-editorial p-4">
          <h3 className="font-bold text-ink mb-2 text-sm">
            Who's Online ({onlineUsers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((u) => (
              <div key={u.userId} className="flex items-center gap-1.5">
                {u.userPhotoURL ? (
                  <img
                    src={u.userPhotoURL}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-bg flex items-center justify-center text-xs font-bold text-brand">
                    {u.userName?.[0] || "?"}
                  </div>
                )}
                <span className="text-xs font-medium text-ink-soft">
                  {u.userName?.split(" ")[0]}
                </span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hot Markets */}
      <div>
        <h3 className="font-bold text-ink mb-3">Hot Markets</h3>
        <div className="space-y-3">
          {predictions.slice(0, 10).map((pred, i) => {
            const isBinary = !pred.type || pred.type === "open" || pred.type === "tagged";
            const isMulti = pred.type === "multi";
            const isOverUnder = pred.type === "overunder";
            const isConditional = pred.type === "conditional";
            const dualOdds = isBinary || isConditional
              ? formatDualOdds(pred.totalYes, pred.totalNo)
              : null;

            return (
              <motion.div
                key={pred.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-editorial p-4"
              >
                <p className="text-sm font-semibold text-ink mb-2">
                  {pred.text}
                </p>

                {isConditional && pred.condition && (
                  <ConditionalBadge
                    condition={pred.condition}
                    conditionMet={pred.conditionMet}
                  />
                )}

                {(isBinary || isConditional) && dualOdds && (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-green-50 rounded-xl py-2 text-center">
                      <span className="mono-label text-ink-mute">
                        {isOverUnder ? "OVER" : "YES"}
                      </span>
                      <p>
                        <AnimatedNumber
                          value={dualOdds.yes.percent}
                          format="percent"
                          className="text-xl font-extrabold text-green-600"
                        />
                      </p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl py-2 text-center">
                      <span className="mono-label text-ink-mute">
                        {isOverUnder ? "UNDER" : "NO"}
                      </span>
                      <p>
                        <AnimatedNumber
                          value={dualOdds.no.percent}
                          format="percent"
                          className="text-xl font-extrabold text-red-500"
                        />
                      </p>
                    </div>
                  </div>
                )}

                {isOverUnder && (
                  <OverUnderOdds
                    line={pred.line}
                    unit={pred.unit}
                    totalYes={pred.totalYes}
                    totalNo={pred.totalNo}
                    actualValue={pred.actualValue}
                    readOnly
                  />
                )}

                {isMulti && pred.outcomes && (
                  <MultiOutcomeOdds outcomes={pred.outcomes} />
                )}

                {myBets[pred.id] && (
                  <p className="mono-label font-bold text-brand mt-2">
                    Your bet: {myBets[pred.id].toUpperCase()}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Your Active Bets */}
      {myBetPredictions.length > 0 && (
        <div>
          <h3 className="font-bold text-ink mb-3">Your Active Bets</h3>
          <div className="space-y-2">
            {myBetPredictions.map((pred, i) => {
              const uv = unrealizedValue(pred, myBets[pred.id]);
              return (
                <motion.div
                  key={pred.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-xl p-3 border-2 ${
                    uv >= 0 ? "border-green-300" : "border-red-300"
                  }`}
                >
                  <p className="text-sm font-medium text-ink-soft mb-1">
                    {pred.text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="mono-label font-bold text-brand">
                      {myBets[pred.id]?.toUpperCase()}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        uv >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {uv >= 0 ? "+" : ""}
                      {formatCurrency(uv)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
