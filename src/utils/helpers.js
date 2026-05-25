/**
 * Generate a random 6-character alphanumeric join code.
 */
export function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Format a Firestore timestamp to a readable string.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format currency amount.
 */
export function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

/**
 * Phase display config.
 */
export const PHASE_CONFIG = {
  posting: {
    label: "Posting Predictions",
    color: "bg-purple-500",
    emoji: "✏️",
    description: "Add your predictions for the event!",
  },
  betting: {
    label: "Place Your Bets",
    color: "bg-pink-500",
    emoji: "🎰",
    description: "Bet on predictions — $10 per bet!",
  },
  live: {
    label: "Event Live",
    color: "bg-orange-500",
    emoji: "🔥",
    description: "The event is happening! No more bets.",
  },
  resolving: {
    label: "Resolving",
    color: "bg-yellow-500",
    emoji: "⚖️",
    description: "The adjudicator is resolving predictions.",
  },
  complete: {
    label: "Complete",
    color: "bg-green-500",
    emoji: "🏆",
    description: "All done! Check the results.",
  },
};
