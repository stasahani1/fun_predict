import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

const COLORS = [
  { bg: "bg-brand-bg", text: "text-brand", bar: "bg-brand" },
  { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
  { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500" },
  { bg: "bg-yellow-50", text: "text-yellow-700", bar: "bg-yellow-500" },
  { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500" },
  { bg: "bg-cream-dark", text: "text-ink-soft", bar: "bg-ink-mute" },
  { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
  { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500" },
  { bg: "bg-orange-100", text: "text-orange-700", bar: "bg-orange-500" },
  { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500" },
];

export default function MultiOutcomeOdds({
  outcomes,
  onBet,
  userBet,
  betting,
  resolution,
}) {
  const totalBets = outcomes.reduce((sum, o) => sum + (o.totalBets || 0), 0);

  return (
    <div className="space-y-2">
      {outcomes.map((outcome, i) => {
        const color = COLORS[i % COLORS.length];
        const percent =
          totalBets > 0
            ? Math.round(((outcome.totalBets || 0) / totalBets) * 100)
            : Math.round(100 / outcomes.length);
        const pool = totalBets * 10;
        const payout =
          outcome.totalBets > 0
            ? pool / outcome.totalBets
            : pool + 10;
        const isWinner = resolution === outcome.id;
        const isUserBet = userBet === outcome.id;
        const isClickable = onBet && !userBet && !betting;

        return (
          <motion.button
            key={outcome.id}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onBet(outcome.id)}
            className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
              isWinner
                ? "border-green-400 bg-green-50 ring-2 ring-green-300"
                : isUserBet
                ? `border-brand ${color.bg} ring-2 ring-brand`
                : `border-rule-dark ${color.bg} hover:border-brand`
            } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
            whileTap={isClickable ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-bold ${color.text}`}>
                {outcome.label}
                {isUserBet && (
                  <span className="ml-2 text-xs bg-brand text-white px-2 py-0.5 rounded-full">
                    Your bet
                  </span>
                )}
                {isWinner && (
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    Winner
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                <AnimatedNumber
                  value={percent}
                  format="percent"
                  className={`text-lg font-extrabold ${color.text}`}
                />
                {totalBets > 0 && outcome.totalBets > 0 && (
                  <span className="text-xs text-ink-mute">
                    $10 {"\u2192"} ${payout.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {/* Probability bar */}
            <div className="w-full bg-rule rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${color.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-ink-mute mt-1">
              {outcome.totalBets || 0} bet{(outcome.totalBets || 0) !== 1 ? "s" : ""}
            </p>
          </motion.button>
        );
      })}
      {betting && (
        <p className="text-center text-sm text-brand font-medium animate-pulse">
          Placing bet...
        </p>
      )}
    </div>
  );
}
