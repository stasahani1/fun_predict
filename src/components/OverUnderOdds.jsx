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
  betting,
}) {
  const dualOdds = formatDualOdds(totalYes, totalNo);

  return (
    <div className="space-y-3">
      {/* Line display */}
      <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
          The Line
        </p>
        <p className="text-3xl font-extrabold text-gray-800">
          {line} <span className="text-lg text-gray-500">{unit}</span>
        </p>
        {actualValue !== null && actualValue !== undefined && (
          <p className="text-sm font-bold text-purple-600 mt-1">
            Actual: {actualValue} {unit}
          </p>
        )}
      </div>

      {/* OVER / UNDER cards */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={readOnly || !!userBet || betting}
          onClick={() => onBet && onBet("yes")}
          className={`flex-1 rounded-xl py-3 text-center transition-all ${
            userBet === "yes"
              ? "bg-green-200 ring-2 ring-green-400"
              : "bg-green-50"
          } ${!readOnly && !userBet && !betting ? "cursor-pointer hover:bg-green-100" : "cursor-default"}`}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            OVER
          </span>
          <p>
            <AnimatedNumber
              value={dualOdds.yes.percent}
              format="percent"
              className="text-2xl font-extrabold text-green-600"
            />
          </p>
          <p className="text-xs text-gray-400">
            $10 {"\u2192"}{" "}
            <AnimatedNumber
              value={dualOdds.yes.payout}
              format="currency"
              className="text-xs"
            />
          </p>
          {userBet === "yes" && (
            <p className="text-xs font-bold text-green-700 mt-1">Your bet</p>
          )}
        </button>

        <button
          type="button"
          disabled={readOnly || !!userBet || betting}
          onClick={() => onBet && onBet("no")}
          className={`flex-1 rounded-xl py-3 text-center transition-all ${
            userBet === "no"
              ? "bg-red-200 ring-2 ring-red-400"
              : "bg-red-50"
          } ${!readOnly && !userBet && !betting ? "cursor-pointer hover:bg-red-100" : "cursor-default"}`}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            UNDER
          </span>
          <p>
            <AnimatedNumber
              value={dualOdds.no.percent}
              format="percent"
              className="text-2xl font-extrabold text-red-500"
            />
          </p>
          <p className="text-xs text-gray-400">
            $10 {"\u2192"}{" "}
            <AnimatedNumber
              value={dualOdds.no.payout}
              format="currency"
              className="text-xs"
            />
          </p>
          {userBet === "no" && (
            <p className="text-xs font-bold text-red-700 mt-1">Your bet</p>
          )}
        </button>
      </div>

      {betting && (
        <p className="text-center text-sm text-purple-500 font-medium animate-pulse">
          Placing bet...
        </p>
      )}
    </div>
  );
}
