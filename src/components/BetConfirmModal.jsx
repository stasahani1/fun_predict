import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "../utils/helpers";
import { BET_AMOUNT } from "../utils/payouts";
import PayoutInfoTooltip from "./PayoutInfoTooltip";

export default function BetConfirmModal({
  open,
  prediction,
  side,
  balance,
  estimatedPayout,
  impliedProb,
  poolSharePct,
  onConfirm,
  onCancel,
  submitting,
  blind,
}) {
  if (!open || !prediction) return null;

  const sideLabel = prediction.type === "overunder"
    ? (side === "yes" ? "OVER" : "UNDER")
    : prediction.type === "multi"
    ? (prediction.outcomes?.find((o) => o.id === side)?.label || side)
    : side?.toUpperCase();

  const balanceAfter = balance - BET_AMOUNT;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4 border-t-2 sm:border-2 border-rule-dark shadow-xl"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <h3 className="text-lg font-serif italic text-ink">Confirm Bet</h3>

            <div className="bg-cream rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-ink">{prediction.text}</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  side === "yes" ? "bg-green-100 text-green-700"
                  : side === "no" ? "bg-red-100 text-red-700"
                  : "bg-brand-bg text-brand"
                }`}>
                  {sideLabel}
                </span>
                <span className="text-sm text-ink-mute">
                  {formatCurrency(BET_AMOUNT)}
                </span>
              </div>
            </div>

            {blind ? (
              <p className="text-sm text-ink-mute italic text-center">
                Blind bet -- odds hidden
              </p>
            ) : (
              <div className="space-y-1 text-sm">
                {impliedProb != null && (
                  <div className="flex justify-between">
                    <span className="text-ink-mute">Implied probability</span>
                    <span className="font-medium text-ink">{Math.round(impliedProb * 100)}%</span>
                  </div>
                )}
                {estimatedPayout != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-ink-mute flex items-center gap-1">
                      Estimated payout <PayoutInfoTooltip />
                    </span>
                    <span className="font-medium text-ink">
                      {formatCurrency(BET_AMOUNT)} {"\u2192"} ~{formatCurrency(estimatedPayout)} (est.)
                    </span>
                  </div>
                )}
                {poolSharePct != null && poolSharePct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-mute">Your pool share</span>
                    <span className="font-medium text-ink">{Math.round(poolSharePct * 100)}% of {sideLabel} pool</span>
                  </div>
                )}
                <p className="text-xs text-ink-mute italic pt-1">
                  Estimated -- may change as more bets come in
                </p>
              </div>
            )}

            <div className="border-t border-rule pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-mute">Current balance</span>
                <span className="font-medium text-ink">{formatCurrency(balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">After this bet</span>
                <span className={`font-bold ${balanceAfter >= 0 ? "text-brand" : "text-red-500"}`}>
                  {formatCurrency(balanceAfter)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                disabled={submitting}
                className="flex-1 border-2 border-rule-dark text-ink-soft font-bold py-3 rounded-xl hover:bg-cream transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                onClick={onConfirm}
                disabled={submitting || balance < BET_AMOUNT}
                className="flex-1 bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                {submitting ? "Placing..." : "Confirm Bet"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
