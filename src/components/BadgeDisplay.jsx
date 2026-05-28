import { BADGE_DEFINITIONS } from "../utils/gamification";

export default function BadgeDisplay({ earnedBadges = [], large = false }) {
  return (
    <div className={`${large ? "space-y-3" : "flex flex-wrap gap-2"}`}>
      {BADGE_DEFINITIONS.map((badge) => {
        const earned = earnedBadges.includes(badge.id);
        if (large) {
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                earned
                  ? "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"
                  : "bg-gray-50 border border-gray-200 opacity-60"
              }`}
            >
              <span className={`text-2xl ${earned ? "" : "grayscale"}`}>
                {earned ? badge.emoji : "\uD83D\uDD12"}
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm font-bold ${
                    earned ? "text-purple-700" : "text-gray-400"
                  }`}
                >
                  {badge.name}
                </p>
                <p className="text-xs text-gray-500">{badge.description}</p>
              </div>
              {earned && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                  Earned
                </span>
              )}
            </div>
          );
        }

        if (!earned) return null;
        return (
          <span
            key={badge.id}
            className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full"
            title={badge.description}
          >
            {badge.emoji} {badge.name}
          </span>
        );
      })}
    </div>
  );
}
