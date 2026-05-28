export default function StreakDisplay({ currentStreak, longestStreak }) {
  return (
    <div className="card-editorial p-5">
      <h3 className="font-bold text-ink mb-3">Prediction Streak</h3>
      <div className="flex items-center gap-4">
        <div className="text-center flex-1">
          <p className="text-3xl mb-1">
            {currentStreak > 0 ? "\uD83D\uDD25" : "\u2744\uFE0F"}
          </p>
          <p className="text-2xl font-extrabold text-ink tabular-nums font-mono">
            {currentStreak || 0}
          </p>
          <p className="mono-label text-ink-mute">Current streak</p>
        </div>
        <div className="w-px h-12 bg-rule-dark" />
        <div className="text-center flex-1">
          <p className="text-3xl mb-1">{"\uD83C\uDFC6"}</p>
          <p className="text-2xl font-extrabold text-ink tabular-nums font-mono">
            {longestStreak || 0}
          </p>
          <p className="mono-label text-ink-mute">Longest streak</p>
        </div>
      </div>
    </div>
  );
}
