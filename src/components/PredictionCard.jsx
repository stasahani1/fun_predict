import { motion } from "framer-motion";
import { formatOdds } from "../utils/payouts";

export default function PredictionCard({
  prediction,
  index = 0,
  showOdds = false,
  children,
}) {
  const odds = formatOdds(prediction.totalYes, prediction.totalNo);
  const totalBets = prediction.totalYes + prediction.totalNo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 hover:shadow-md transition-shadow"
    >
      <p className="text-base font-semibold text-gray-800 mb-2">
        {prediction.text}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-purple-500 font-medium">
          by {prediction.creatorName}
        </span>
        {prediction.taggedMembers?.length > 0 && (
          <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
            feat. {prediction.taggedMembers.map((m) => m.name).join(", ")}
          </span>
        )}
      </div>

      {showOdds && totalBets > 0 && (
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
            <span className="text-xs text-gray-500">YES</span>
            <p className="text-lg font-bold text-green-600">{odds.yes}</p>
            <span className="text-xs text-gray-400">{prediction.totalYes} bets</span>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
            <span className="text-xs text-gray-500">NO</span>
            <p className="text-lg font-bold text-red-500">{odds.no}</p>
            <span className="text-xs text-gray-400">{prediction.totalNo} bets</span>
          </div>
        </div>
      )}

      {prediction.resolution && (
        <div
          className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
            prediction.resolution === "yes"
              ? "bg-green-100 text-green-700"
              : prediction.resolution === "no"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {prediction.resolution === "yes"
            ? "Happened"
            : prediction.resolution === "no"
            ? "Didn't happen"
            : "Voided"}
        </div>
      )}

      {children}
    </motion.div>
  );
}
