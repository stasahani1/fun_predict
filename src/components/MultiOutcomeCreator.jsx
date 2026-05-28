import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MultiOutcomeCreator({ outcomes, setOutcomes, members }) {
  const [newLabel, setNewLabel] = useState("");

  const addOutcome = () => {
    const label = newLabel.trim();
    if (!label || outcomes.length >= 10) return;
    setOutcomes([
      ...outcomes,
      { id: `outcome_${outcomes.length}`, label, totalBets: 0 },
    ]);
    setNewLabel("");
  };

  const removeOutcome = (id) => {
    if (outcomes.length <= 2) return;
    setOutcomes(outcomes.filter((o) => o.id !== id));
  };

  const useTaggedMembers = () => {
    if (!members || members.length < 2) return;
    setOutcomes(
      members.map((m, i) => ({
        id: `outcome_${i}`,
        label: m.name,
        totalBets: 0,
      }))
    );
  };

  return (
    <div className="space-y-3">
      <label className="block mono-label text-ink-soft">
        Outcomes (min 2, max 10)
      </label>

      {members && members.length >= 2 && (
        <button
          type="button"
          onClick={useTaggedMembers}
          className="text-xs bg-brand-bg text-brand px-3 py-1.5 rounded-full font-medium hover:bg-brand-soft transition-colors"
        >
          Use event members as outcomes
        </button>
      )}

      <AnimatePresence>
        {outcomes.map((o) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <span className="flex-1 bg-brand-bg text-brand font-medium px-3 py-2 rounded-xl text-sm">
              {o.label}
            </span>
            {outcomes.length > 2 && (
              <button
                type="button"
                onClick={() => removeOutcome(o.id)}
                className="text-red-400 hover:text-red-600 text-lg font-bold px-2"
              >
                x
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {outcomes.length < 10 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOutcome())}
            placeholder="Add an outcome..."
            className="flex-1 px-3 py-2 rounded-xl border-2 border-rule-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            maxLength={50}
          />
          <button
            type="button"
            onClick={addOutcome}
            disabled={!newLabel.trim()}
            className="bg-brand text-white font-bold px-4 py-2 rounded-xl text-sm border-2 border-ink disabled:opacity-50 hover:bg-brand/90 transition-colors"
          >
            +
          </button>
        </div>
      )}

      <p className="text-xs text-ink-mute">
        {outcomes.length}/10 outcomes
      </p>
    </div>
  );
}
