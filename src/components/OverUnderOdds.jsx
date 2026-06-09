import AnimatedNumber from "./AnimatedNumber";
import { formatDualOdds } from "../utils/payouts";

export default function OverUnderOdds({
  line,
  unit,
  totalYes,
  totalNo,
  actualValue,
  readOnly = false,
  onBet,
  userBet,
  blind,
}) {
  const dualOdds = formatDualOdds(totalYes, totalNo);
  const isClickable = !readOnly && !!onBet;

  return (
    <div className="space-y-3">
      {/* Line display */}
      <div className="text-center py-3 bg-cream rounded-xl border-2 border-rule-dark">
        <p className="mono-label text-ink-mute mb-1">
          The Line
        </p>
        <p className="text-3xl font-extrabold text-ink">
          {line} <span className="text-lg text-ink-mute">{unit}</span>
        </p>
        {actualValue !== null && actualValue !== undefined && (
          <p className="text-sm font-bold text-brand mt-1">
            Actual: {actualValue} {unit}
          </p>
        )}
      </div>

      {/* OVER / UNDER cards */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!isClickable}
          onClick={() => isClickable && onBet("yes")}
          className={`flex-1 rounded-xl py-3 text-center transition-all ${
            userBet === "yes"
              ? "bg-green-200 ring-2 ring-green-400"
              : "bg-green-50"
          } ${isClickable ? "cursor-pointer hover:bg-green-100" : "cursor-default"}`}
        >
          <span className="mono-label text-ink-mute">
            OVER
          </span>
          {blind ? (
            <p className="text-2xl font-extrabold text-green-600">??</p>
          ) : (
            <>
              <p>
                <AnimatedNumber
                  value={dualOdds.yes.percent}
                  format="percent"
                  className="text-2xl font-extrabold text-green-600"
                />
              </p>
              <p className="text-xs text-ink-mute">
                $10 {"\u2192"}{" "}
                ~<AnimatedNumber
                  value={dualOdds.yes.payout}
                  format="currency"
                  className="text-xs"
                /> (est.)
              </p>
            </>
          )}
          {userBet === "yes" && (
            <p className="text-xs font-bold text-green-700 mt-1">Your bet</p>
          )}
        </button>

        <button
          type="button"
          disabled={!isClickable}
          onClick={() => isClickable && onBet("no")}
          className={`flex-1 rounded-xl py-3 text-center transition-all ${
            userBet === "no"
              ? "bg-red-200 ring-2 ring-red-400"
              : "bg-red-50"
          } ${isClickable ? "cursor-pointer hover:bg-red-100" : "cursor-default"}`}
        >
          <span className="mono-label text-ink-mute">
            UNDER
          </span>
          {blind ? (
            <p className="text-2xl font-extrabold text-red-500">??</p>
          ) : (
            <>
              <p>
                <AnimatedNumber
                  value={dualOdds.no.percent}
                  format="percent"
                  className="text-2xl font-extrabold text-red-500"
                />
              </p>
              <p className="text-xs text-ink-mute">
                $10 {"\u2192"}{" "}
                ~<AnimatedNumber
                  value={dualOdds.no.payout}
                  format="currency"
                  className="text-xs"
                /> (est.)
              </p>
            </>
          )}
          {userBet === "no" && (
            <p className="text-xs font-bold text-red-700 mt-1">Your bet</p>
          )}
        </button>
      </div>
    </div>
  );
}
