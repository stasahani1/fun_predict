import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDualOdds, isBinaryPrediction } from "../utils/payouts";
import { PREDICTION_CATEGORIES } from "../utils/helpers";
import AnimatedNumber from "./AnimatedNumber";
import CommentThread from "./CommentThread";
import MultiOutcomeOdds from "./MultiOutcomeOdds";
import OverUnderOdds from "./OverUnderOdds";
import ConditionalBadge from "./ConditionalBadge";

export default function PredictionCard({
  prediction,
  index = 0,
  showOdds = false,
  eventId,
  user,
  bets,
  children,
}) {
  const isBinary = isBinaryPrediction(prediction);
  const isMulti = prediction.type === "multi";
  const isOverUnder = prediction.type === "overunder";
  const isConditional = prediction.type === "conditional";

  const dualOdds = (isBinary || isConditional)
    ? formatDualOdds(prediction.totalYes, prediction.totalNo)
    : null;
  const totalBets = isMulti
    ? (prediction.outcomes || []).reduce((s, o) => s + (o.totalBets || 0), 0)
    : prediction.totalYes + prediction.totalNo;
  const categoryObj = PREDICTION_CATEGORIES.find((c) => c.id === prediction.category);

  const prevYesRef = useRef(dualOdds?.yes?.percent);
  const [oddsChange, setOddsChange] = useState(null);

  useEffect(() => {
    if (!dualOdds) return;
    const prev = prevYesRef.current;
    const curr = dualOdds.yes.percent;
    if (prev !== curr && totalBets > 0) {
      const diff = curr - prev;
      setOddsChange(diff);
      const timer = setTimeout(() => setOddsChange(null), 3000);
      prevYesRef.current = curr;
      return () => clearTimeout(timer);
    }
    prevYesRef.current = curr;
  }, [dualOdds?.yes?.percent, totalBets]);

  const predBets = bets || [];
  const displayBets = predBets.slice(0, 5);
  const extraBets = predBets.length - 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="card-editorial p-5 hover:shadow-[6px_6px_0_0_#181410] transition-shadow"
    >
      <p className="text-base font-semibold text-ink mb-2">
        {prediction.text}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-brand font-medium">
          by {prediction.creatorName}
        </span>
        {categoryObj && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryObj.color}`}>
            {categoryObj.emoji} {categoryObj.label}
          </span>
        )}
        {prediction.taggedMembers?.length > 0 && (
          <span className="text-xs bg-brand-bg text-brand px-2 py-0.5 rounded-full">
            feat. {prediction.taggedMembers.map((m) => m.name).join(", ")}
          </span>
        )}
        {prediction.type && !isBinary && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
            {isMulti ? "Multi" : isOverUnder ? "O/U" : "Cond."}
          </span>
        )}
      </div>
      {prediction.resolutionCriteria && (
        <p className="text-xs text-ink-mute italic mb-3">
          {"\u2696\uFE0F"} {prediction.resolutionCriteria}
        </p>
      )}

      {isConditional && prediction.condition && (
        <ConditionalBadge
          condition={prediction.condition}
          conditionMet={prediction.conditionMet}
        />
      )}

      {showOdds && isMulti && prediction.outcomes && (
        <div className="mb-3">
          <MultiOutcomeOdds
            outcomes={prediction.outcomes}
            resolution={prediction.resolution}
          />
        </div>
      )}

      {showOdds && isOverUnder && (
        <div className="mb-3">
          <OverUnderOdds
            line={prediction.line}
            unit={prediction.unit}
            totalYes={prediction.totalYes}
            totalNo={prediction.totalNo}
            actualValue={prediction.actualValue}
            readOnly
          />
        </div>
      )}

      {showOdds && (isBinary || isConditional) && dualOdds && (
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
            <span className="mono-label text-ink-mute">YES</span>
            <div className="flex items-center justify-center gap-1">
              <AnimatedNumber
                value={dualOdds.yes.percent}
                format="percent"
                className="text-2xl font-extrabold text-green-600"
              />
              <AnimatePresence>
                {oddsChange !== null && oddsChange > 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-bold text-green-500"
                  >
                    {"\u2191"}{Math.abs(oddsChange)}%
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-ink-mute">
              $10 {"\u2192"} <AnimatedNumber value={dualOdds.yes.payout} format="currency" className="text-xs" />
            </p>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
            <span className="mono-label text-ink-mute">NO</span>
            <div className="flex items-center justify-center gap-1">
              <AnimatedNumber
                value={dualOdds.no.percent}
                format="percent"
                className="text-2xl font-extrabold text-red-500"
              />
              <AnimatePresence>
                {oddsChange !== null && oddsChange < 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-bold text-red-500"
                  >
                    {"\u2191"}{Math.abs(oddsChange)}%
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-ink-mute">
              $10 {"\u2192"} <AnimatedNumber value={dualOdds.no.payout} format="currency" className="text-xs" />
            </p>
          </div>
        </div>
      )}

      {predBets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {displayBets.map((bet, i) => {
            let sideLabel = bet.side.toUpperCase();
            if (isMulti && prediction.outcomes) {
              const outcome = prediction.outcomes.find((o) => o.id === bet.side);
              if (outcome) sideLabel = outcome.label;
            }
            if (isOverUnder) {
              sideLabel = bet.side === "yes" ? "OVER" : "UNDER";
            }
            return (
              <span
                key={i}
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
          {extraBets > 0 && (
            <span className="text-xs text-ink-mute px-2 py-0.5">
              +{extraBets} more
            </span>
          )}
        </div>
      )}

      {prediction.resolution && (
        <div
          className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
            prediction.resolution === "yes"
              ? "bg-green-100 text-green-700"
              : prediction.resolution === "no"
              ? "bg-red-100 text-red-700"
              : prediction.resolution === "void"
              ? "bg-gray-100 text-gray-500"
              : "bg-brand-bg text-brand"
          }`}
        >
          {(() => {
            if (isMulti) {
              if (prediction.resolution === "void") return "Voided";
              const winner = (prediction.outcomes || []).find(
                (o) => o.id === prediction.resolution
              );
              return `Winner: ${winner?.label || prediction.resolution}`;
            }
            if (isOverUnder) {
              if (prediction.resolution === "void") return "Voided (Push)";
              return prediction.resolution === "yes"
                ? `OVER (${prediction.actualValue})`
                : `UNDER (${prediction.actualValue})`;
            }
            if (isConditional && prediction.conditionMet === false) {
              return "Voided — Condition not met";
            }
            return prediction.resolution === "yes"
              ? "Happened"
              : prediction.resolution === "no"
              ? "Didn't happen"
              : "Voided";
          })()}
        </div>
      )}

      {eventId && user && (
        <CommentThread
          eventId={eventId}
          predictionId={prediction.id}
          user={user}
        />
      )}

      {children}
    </motion.div>
  );
}
