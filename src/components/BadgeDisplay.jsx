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
                  ? "bg-cream border-2 border-rule-dark"
                  : "bg-gray-50 border border-gray-200 opacity-60"
              }`}
            >
              <span className={`text-2xl ${earned ? "" : "grayscale"}`}>
                {earned ? badge.emoji : "\uD83D\uDD12"}
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm font-bold ${
                    earned ? "text-ink" : "text-gray-400"
                  }`}
                >
                  {badge.name}
                </p>
                <p className="text-xs text-ink-mute">{badge.description}</p>
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
            className="inline-flex items-center gap-1 bg-brand-bg text-brand text-xs font-bold px-2 py-1 rounded-full"
            title={badge.description}
          >
            {badge.emoji} {badge.name}
          </span>
        );
      })}
    </div>
  );
}
