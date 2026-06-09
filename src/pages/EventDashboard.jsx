import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import PhaseIndicator from "../components/PhaseIndicator";
import PredictionCard from "../components/PredictionCard";
import Leaderboard from "../components/Leaderboard";
import { motion, AnimatePresence } from "framer-motion";
import { PHASE_CONFIG, PREDICTION_STATUS } from "../utils/helpers";
import { migrateEventPhase, migratePrediction } from "../utils/migration";

const PHASE_ORDER = ["lobby", "active", "resolving", "complete"];

export default function EventDashboard({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [balances, setBalances] = useState([]);
  const [betsByPrediction, setBetsByPrediction] = useState({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAboutMe, setShowAboutMe] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", eventId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const phase = migrateEventPhase(data.phase);
        setEvent({ id: snap.id, ...data, phase });
      }
      setLoading(false);
    });
    return unsub;
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    const unsub = onSnapshot(
      collection(db, "events", eventId, "predictions"),
      (snap) => {
        const preds = [];
        snap.forEach((d) => {
          const raw = { id: d.id, ...d.data() };
          preds.push(migratePrediction(raw, event.phase));
        });
        preds.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setPredictions(preds);
      }
    );
    return unsub;
  }, [eventId, event?.phase]);

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
    const unsub = onSnapshot(
      collection(db, "events", eventId, "bets"),
      (snap) => {
        const grouped = {};
        snap.forEach((d) => {
          const bet = d.data();
          if (!grouped[bet.predictionId]) grouped[bet.predictionId] = [];
          grouped[bet.predictionId].push(bet);
        });
        setBetsByPrediction(grouped);
      }
    );
    return unsub;
  }, [eventId]);

  // Auto-lock predictions with closeTime past due
  useEffect(() => {
    if (!event || event.phase !== "active") return;
    const interval = setInterval(async () => {
      const now = new Date();
      for (const pred of predictions) {
        if (pred.status === "open" && pred.closeTime) {
          const closeDate = pred.closeTime.toDate ? pred.closeTime.toDate() : new Date(pred.closeTime);
          if (closeDate <= now) {
            try {
              await updateDoc(
                doc(db, "events", eventId, "predictions", pred.id),
                { status: "locked" }
              );
            } catch (e) {
              console.error("Error auto-locking prediction:", e);
            }
          }
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [event?.phase, predictions, eventId]);

  const isCreator = event?.creatorId === user.uid;

  const advancePhase = async () => {
    if (!isCreator || !event) return;
    const currentIdx = PHASE_ORDER.indexOf(event.phase);
    if (currentIdx < PHASE_ORDER.length - 1) {
      await updateDoc(doc(db, "events", eventId), {
        phase: PHASE_ORDER[currentIdx + 1],
      });
    }
  };

  const lockAllOpen = async () => {
    const batch = writeBatch(db);
    for (const pred of predictions) {
      if (pred.status === "open") {
        batch.update(
          doc(db, "events", eventId, "predictions", pred.id),
          { status: "locked" }
        );
      }
    }
    await batch.commit();
  };

  const moveToResolving = async () => {
    const batch = writeBatch(db);
    for (const pred of predictions) {
      if (pred.status === "open") {
        batch.update(
          doc(db, "events", eventId, "predictions", pred.id),
          { status: "locked" }
        );
      }
    }
    batch.update(doc(db, "events", eventId), { phase: "resolving" });
    await batch.commit();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(event.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-rule-dark border-t-brand" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-ink-mute">Event not found.</div>
    );
  }

  const nextPhase = PHASE_ORDER[PHASE_ORDER.indexOf(event.phase) + 1];
  const showOdds = (pred) => pred.status !== "open" || (betsByPrediction[pred.id]?.length > 0);

  // Filter out predictions hidden from tagged user
  const isVisibleToUser = (pred) => {
    if (!pred.taggedMembers?.some((m) => m.uid === user.uid)) return true;
    if (pred.visibleToTagged !== false) return true;
    if (pred.resolution) return true; // Revealed after resolution
    return false;
  };

  return (
    <div className="space-y-5">
      {/* Event Header */}
      <div>
        <h2 className="text-2xl font-serif italic text-ink">{event.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={copyCode}
            className="mono-label font-bold bg-brand-bg text-brand px-3 py-1 rounded-full hover:bg-brand-soft transition-colors"
          >
            {copied ? "Copied!" : `Code: ${event.code}`}
          </button>
          <span className="text-xs text-ink-mute">
            {event.members?.length || 1} members
          </span>
        </div>
      </div>

      {/* Phase Indicator */}
      <PhaseIndicator currentPhase={event.phase} />

      {/* Lobby Phase UI */}
      {event.phase === "lobby" && (
        <motion.div
          className="card-editorial p-6 text-center space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="mono-label text-ink-soft">Join Code</p>
          <button
            onClick={copyCode}
            className="inline-block text-5xl font-mono font-black tracking-[0.3em] text-brand bg-brand-bg px-6 py-4 rounded-2xl border-2 border-rule-dark hover:bg-brand-soft transition-colors"
          >
            {copied ? "Copied!" : event.code}
          </button>
          <p className="text-xs text-ink-mute">Tap to copy</p>

          <div className="pt-2">
            <p className="text-sm font-bold text-ink mb-2">
              {event.members?.length || 1} player{(event.members?.length || 1) !== 1 ? "s" : ""} joined
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {event.members?.map((m) => (
                <span
                  key={m.uid}
                  className="bg-brand-bg text-brand text-sm font-medium px-3 py-1 rounded-full"
                >
                  {m.name}
                  {m.uid === event.creatorId && " (host)"}
                </span>
              ))}
            </div>
          </div>

          {!isCreator && (
            <p className="text-ink-mute text-sm italic pt-2">
              Waiting for host to start...
            </p>
          )}
        </motion.div>
      )}

      {/* Action Buttons based on phase */}
      <div className="flex gap-3">
        {event.phase === "active" && (
          <>
            <motion.button
              onClick={() => navigate(`/event/${eventId}/post`)}
              className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              Post a Prediction
            </motion.button>
            <motion.button
              onClick={() => navigate(`/event/${eventId}/bet`)}
              className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              Place Bets
            </motion.button>
          </>
        )}
        {event.phase === "active" && (
          <motion.button
            onClick={() => navigate(`/event/${eventId}/live`)}
            className="flex-shrink-0 bg-brand/10 text-brand font-bold py-3 px-4 rounded-xl border-2 border-rule-dark"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            Live
          </motion.button>
        )}
        {event.phase === "resolving" && isCreator && (
          <motion.button
            onClick={() => navigate(`/event/${eventId}/resolve`)}
            className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            Resolve Predictions
          </motion.button>
        )}
        {event.phase === "complete" && (
          <motion.button
            onClick={() => navigate(`/event/${eventId}/results`)}
            className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            View Results
          </motion.button>
        )}
      </div>

      {/* Creator controls for active phase */}
      {isCreator && event.phase === "active" && (
        <div className="flex gap-3">
          <motion.button
            onClick={lockAllOpen}
            className="flex-1 border-2 border-yellow-400 text-yellow-700 font-bold py-3 rounded-xl hover:bg-yellow-50 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Lock All Open
          </motion.button>
          <motion.button
            onClick={moveToResolving}
            className="flex-1 border-2 border-rule-dark text-brand font-bold py-3 rounded-xl hover:bg-brand-bg transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Move to Resolving
          </motion.button>
        </div>
      )}

      {/* Generic advance button for non-active phases */}
      {isCreator && nextPhase && event.phase !== "active" && (
        <motion.button
          onClick={advancePhase}
          className="w-full border-2 border-rule-dark text-brand font-bold py-3 rounded-xl hover:bg-brand-bg transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          Advance to {PHASE_CONFIG[nextPhase]?.label || nextPhase}
        </motion.button>
      )}

      {/* Predictions About You */}
      {(() => {
        const aboutMe = predictions.filter(
          (p) => p.taggedMembers?.some((m) => m.uid === user.uid) && isVisibleToUser(p)
        );
        if (aboutMe.length === 0) return null;
        return (
          <div>
            <button
              onClick={() => setShowAboutMe(!showAboutMe)}
              className="w-full text-left bg-brand-bg border-2 border-rule-dark text-brand font-semibold text-sm px-4 py-3 rounded-xl hover:bg-brand-soft transition-colors"
            >
              {"\uD83C\uDFAF"} Predictions About You ({aboutMe.length}){" "}
              {showAboutMe ? "\u25B4" : "\u25BE"}
            </button>
            <AnimatePresence>
              {showAboutMe && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3 mt-3"
                >
                  {aboutMe.map((pred, i) => (
                    <PredictionCard
                      key={pred.id}
                      prediction={pred}
                      index={i}
                      showOdds={showOdds(pred)}
                      eventId={eventId}
                      user={user}
                      bets={betsByPrediction[pred.id]}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Predictions list */}
      {predictions.length > 0 && (
        <div>
          <h3 className="font-bold text-ink mb-3">
            Predictions ({predictions.filter(isVisibleToUser).length})
          </h3>
          <div className="space-y-3">
            {predictions.filter(isVisibleToUser).map((pred, i) => (
              <PredictionCard
                key={pred.id}
                prediction={pred}
                index={i}
                showOdds={showOdds(pred)}
                eventId={eventId}
                user={user}
                bets={betsByPrediction[pred.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {balances.length > 0 && event.phase !== "lobby" && (
        <Leaderboard balances={balances} />
      )}

      {/* Members */}
      <div className="card-editorial p-4">
        <h3 className="font-bold text-ink mb-3">Members</h3>
        <div className="flex flex-wrap gap-2">
          {event.members?.map((m) => (
            <span
              key={m.uid}
              className="bg-brand-bg text-brand text-sm font-medium px-3 py-1 rounded-full"
            >
              {m.name}
              {m.uid === event.creatorId && " (host)"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
