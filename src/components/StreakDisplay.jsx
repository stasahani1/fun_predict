export default function StreakDisplay({ currentStreak, longestStreak }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100">
      <h3 className="font-bold text-purple-800 mb-3">Prediction Streak</h3>
      <div className="flex items-center gap-4">
        <div className="text-center flex-1">
          <p className="text-3xl mb-1">
            {currentStreak > 0 ? "\uD83D\uDD25" : "\u2744\uFE0F"}
          </p>
          <p className="text-2xl font-extrabold text-purple-700 tabular-nums">
            {currentStreak || 0}
          </p>
          <p className="text-xs text-gray-500">Current streak</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div className="text-center flex-1">
          <p className="text-3xl mb-1">{"\uD83C\uDFC6"}</p>
          <p className="text-2xl font-extrabold text-purple-700 tabular-nums">
            {longestStreak || 0}
          </p>
          <p className="text-xs text-gray-500">Longest streak</p>
        </div>
      </div>
    </div>
  );
}
