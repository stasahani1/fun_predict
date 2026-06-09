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
 * Prediction category options.
 */
export const PREDICTION_CATEGORIES = [
  { id: "drinking", label: "Drinking", emoji: "\u{1F37B}", color: "bg-orange-100 text-orange-700" },
  { id: "romance", label: "Romance", emoji: "\u{1F495}", color: "bg-red-100 text-red-700" },
  { id: "logistics", label: "Logistics", emoji: "\u{1F4CB}", color: "bg-blue-100 text-blue-700" },
  { id: "chaos", label: "Chaos", emoji: "\u{1F32A}\uFE0F", color: "bg-red-100 text-red-700" },
  { id: "people", label: "People", emoji: "\u{1F464}", color: "bg-brand-bg text-brand" },
  { id: "other", label: "Other", emoji: "\u2728", color: "bg-cream-dark text-ink-soft" },
];

/**
 * Phase display config.
 */
export const PHASE_CONFIG = {
  lobby: {
    label: "Lobby",
    color: "bg-brand",
    emoji: "👥",
    description: "Share the code — waiting for everyone to join!",
  },
  active: {
    label: "Active",
    color: "bg-brand",
    emoji: "🔥",
    description: "Post predictions and place bets!",
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

/**
 * Per-prediction status config.
 */
export const PREDICTION_STATUS = {
  open: { label: "Open", color: "bg-green-100 text-green-700" },
  locked: { label: "Locked", color: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", color: "bg-gray-100 text-gray-600" },
};
