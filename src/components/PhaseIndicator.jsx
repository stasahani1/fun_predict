import { motion } from "framer-motion";
import { PHASE_CONFIG } from "../utils/helpers";

const PHASES = ["posting", "betting", "live", "resolving", "complete"];

export default function PhaseIndicator({ currentPhase }) {
  const currentIndex = PHASES.indexOf(currentPhase);
  const config = PHASE_CONFIG[currentPhase];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{config.emoji}</span>
        <div>
          <h3 className="font-bold text-purple-800">{config.label}</h3>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
      </div>
      <div className="flex gap-1">
        {PHASES.map((phase, i) => (
          <motion.div
            key={phase}
            className={`h-2 flex-1 rounded-full ${
              i <= currentIndex ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gray-200"
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
