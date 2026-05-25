import { motion } from "framer-motion";

export default function BetCard({ bet, prediction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-purple-50"
    >
      <p className="text-sm font-medium text-gray-700 mb-1 line-clamp-1">
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
        <span className="text-sm text-gray-500 font-medium">${bet.amount}</span>
      </div>
    </motion.div>
  );
}
