import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PayoutInfoTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ink-mute/20 text-ink-mute text-[10px] font-bold hover:bg-ink-mute/30 transition-colors"
        aria-label="Payout info"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-ink text-white text-xs rounded-xl p-3 shadow-lg"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <p className="font-bold mb-1">Parimutuel odds</p>
              <p>
                All bets go into a pool and winners split it proportionally.
                Estimated payouts may change as more bets come in.
              </p>
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-ink" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}
