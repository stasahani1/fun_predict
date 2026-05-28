import { formatBrierScore } from "../utils/gamification";

export default function BrierScoreCard({ score, totalPredictions }) {
  const { label, color } = formatBrierScore(score);

  const gaugePercent = score !== null ? Math.min(score / 0.5, 1) * 100 : 50;

  return (
    <div className="card-editorial p-5">
      <h3 className="font-bold text-ink mb-3">Calibration Score</h3>

      <div className="text-center mb-3">
        <p className={`text-4xl font-extrabold tabular-nums font-mono ${color}`}>
          {score !== null ? score.toFixed(3) : "---"}
        </p>
        <p className={`text-sm font-bold ${color}`}>{label}</p>
        <p className="text-xs text-ink-mute mt-1">
          Based on {totalPredictions || 0} prediction
          {totalPredictions !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Gauge bar */}
      <div className="relative w-full h-3 rounded-full overflow-hidden bg-gradient-to-r from-green-400 via-yellow-400 to-red-500">
        <div
          className="absolute top-0 w-1.5 h-full bg-white border border-ink rounded-full transition-all duration-500"
          style={{ left: `${gaugePercent}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex justify-between mono-label text-ink-mute mt-1">
        <span>Perfect (0.0)</span>
        <span>Random (0.25)</span>
        <span>Bad (0.5)</span>
      </div>
    </div>
  );
}
