import { calculateNetPosition } from "../utils/payouts";
import { formatCurrency } from "../utils/helpers";

export default function NetPositionDisplay({ bets, prediction }) {
  if (!bets || bets.length === 0) return null;

  const pos = calculateNetPosition(bets);
  const isMulti = prediction?.type === "multi";

  if (isMulti) {
    const entries = Object.entries(pos.betsBySide);
    if (entries.length === 0) return null;
    return (
      <div className="bg-brand-bg rounded-xl px-3 py-2 mb-2">
        <p className="mono-label text-ink-mute text-xs mb-1">Your bets</p>
        <div className="flex flex-wrap gap-2">
          {entries.map(([side, amount]) => {
            const outcome = prediction.outcomes?.find((o) => o.id === side);
            return (
              <span key={side} className="text-xs font-bold text-brand">
                {formatCurrency(amount)} on {outcome?.label || side}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Binary / overunder
  const isOverUnder = prediction?.type === "overunder";
  const yesLabel = isOverUnder ? "OVER" : "YES";
  const noLabel = isOverUnder ? "UNDER" : "NO";

  return (
    <div className="bg-brand-bg rounded-xl px-3 py-2 mb-2">
      <p className="mono-label text-ink-mute text-xs mb-1">Your position</p>
      <p className="text-sm font-bold text-brand">
        {pos.yesAmount > 0 && <span>{formatCurrency(pos.yesAmount)} {yesLabel}</span>}
        {pos.yesAmount > 0 && pos.noAmount > 0 && <span className="text-ink-mute mx-1">/</span>}
        {pos.noAmount > 0 && <span>{formatCurrency(pos.noAmount)} {noLabel}</span>}
        {pos.netSide && (
          <span className="text-ink-mute ml-2">
            (net {formatCurrency(pos.netAmount)} {pos.netSide === "yes" ? yesLabel : noLabel})
          </span>
        )}
      </p>
    </div>
  );
}
