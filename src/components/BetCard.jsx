import { motion } from "framer-motion";

export default function BetCard({ bet, prediction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-editorial p-4"
    >
      <p className="text-sm font-medium text-ink-soft mb-1 line-clamp-1">
        {prediction?.text || "Unknown prediction"}
      </p>
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-bold px-3 py-0.5 rounded-full ${
            bet.side === "yes"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {bet.side.toUpperCase()}
        </span>
        <span className="text-sm text-ink-mute font-medium font-mono">${bet.amount}</span>
      </div>
    </motion.div>
  );
}
