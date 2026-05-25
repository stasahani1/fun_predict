import { motion } from "framer-motion";
import { formatCurrency } from "../utils/helpers";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ balances }) {
  const sorted = [...balances].sort((a, b) => b.netProfit - a.netProfit);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
      <h3 className="font-bold text-purple-800 mb-3">Leaderboard</h3>
      <div className="space-y-2">
        {sorted.map((entry, i) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-xl ${
              i === 0 ? "bg-gradient-to-r from-yellow-50 to-orange-50" : "bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg w-8 text-center">
                {i < 3 ? MEDALS[i] : `${i + 1}.`}
              </span>
              <span className="font-semibold text-gray-800">{entry.userName}</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-purple-700">
                {formatCurrency(entry.balance)}
              </p>
              <p
                className={`text-xs font-medium ${
                  entry.netProfit >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {entry.netProfit >= 0 ? "+" : ""}
                {formatCurrency(entry.netProfit)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
