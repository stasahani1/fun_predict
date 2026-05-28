import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import PhaseIndicator from "../components/PhaseIndicator";
import PredictionCard from "../components/PredictionCard";
import Leaderboard from "../components/Leaderboard";
import { motion, AnimatePresence } from "framer-motion";
import { PHASE_CONFIG } from "../utils/helpers";

const PHASE_ORDER = ["posting", "betting", "live", "resolving", "complete"];

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
        setEvent({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return unsub;
  }, [eventId]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "predictions"),
      (snap) => {
        const preds = [];
        snap.forEach((d) => preds.push({ id: d.id, ...d.data() }));
        preds.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
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

      {/* Action Buttons based on phase */}
      <div className="flex gap-3">
        {event.phase === "posting" && (
          <motion.button
            onClick={() => navigate(`/event/${eventId}/post`)}
            className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            Post a Prediction
          </motion.button>
        )}
        {event.phase === "betting" && (
          <motion.button
            onClick={() => navigate(`/event/${eventId}/bet`)}
            className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            Place Bets
          </motion.button>
        )}
        {event.phase === "live" && (
          <motion.button
            onClick={() => navigate(`/event/${eventId}/live`)}
            className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            Live Sweat View
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

      {/* Creator controls */}
      {isCreator && nextPhase && (
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
          (p) => p.taggedMembers?.some((m) => m.uid === user.uid)
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
                      showOdds={event.phase !== "posting"}
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
            Predictions ({predictions.length})
          </h3>
          <div className="space-y-3">
            {predictions.map((pred, i) => (
              <PredictionCard
                key={pred.id}
                prediction={pred}
                index={i}
                showOdds={event.phase !== "posting"}
                eventId={eventId}
                user={user}
                bets={betsByPrediction[pred.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {balances.length > 0 && event.phase !== "posting" && (
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
