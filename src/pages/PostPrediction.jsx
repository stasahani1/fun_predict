import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "framer-motion";
import { PREDICTION_CATEGORIES } from "../utils/helpers";
import { generateTemplates } from "../utils/templates";
import MultiOutcomeCreator from "../components/MultiOutcomeCreator";

const PREDICTION_TYPES = [
  { id: "open", label: "Open", emoji: "\uD83C\uDF0D" },
  { id: "tagged", label: "Tagged", emoji: "\uD83C\uDFF7\uFE0F" },
  { id: "multi", label: "Multi", emoji: "\uD83C\uDFB2" },
  { id: "overunder", label: "Over/Under", emoji: "\uD83D\uDCCA" },
  { id: "conditional", label: "Conditional", emoji: "\u2753" },
];

export default function PostPrediction({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [type, setType] = useState("open");
  const [members, setMembers] = useState([]);
  const [tagged, setTagged] = useState([]);
  const [category, setCategory] = useState("other");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState([]);

  // Multi-outcome state
  const [outcomes, setOutcomes] = useState([
    { id: "outcome_0", label: "Option A", totalBets: 0 },
    { id: "outcome_1", label: "Option B", totalBets: 0 },
  ]);

  // Over/Under state
  const [line, setLine] = useState("");
  const [unit, setUnit] = useState("");

  // Conditional state
  const [condition, setCondition] = useState("");

  useEffect(() => {
    const loadEvent = async () => {
      const snap = await getDoc(doc(db, "events", eventId));
      if (snap.exists()) {
        const data = snap.data();
        setMembers(data.members || []);
      }
    };
    loadEvent();
  }, [eventId, user.uid]);

  // Generate templates when tagged members change
  useEffect(() => {
    if (type === "tagged" && tagged.length > 0) {
      const names = tagged.map((m) => m.name);
      setTemplates(generateTemplates(names));
    } else {
      setTemplates([]);
    }
  }, [tagged, type]);

  const toggleTag = (member) => {
    setTagged((prev) =>
      prev.some((m) => m.uid === member.uid)
        ? prev.filter((m) => m.uid !== member.uid)
        : [...prev, member]
    );
  };

  const applyTemplate = (tmpl) => {
    setText(tmpl.text);
    setResolutionCriteria(tmpl.resolutionCriteria);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type !== "multi" && !text.trim()) return;
    if (type === "multi" && !text.trim()) return;
    if (type !== "overunder" && type !== "conditional" && !resolutionCriteria.trim()) return;

    setSubmitting(true);

    try {
      const payload = {
        text: text.trim(),
        type,
        category,
        resolutionCriteria: resolutionCriteria.trim(),
        creatorId: user.uid,
        creatorName: user.displayName || "Anonymous",
        taggedMembers: type === "tagged" ? tagged : [],
        resolution: null,
        totalYes: 0,
        totalNo: 0,
        createdAt: serverTimestamp(),
      };

      // Type-specific fields
      if (type === "multi") {
        payload.outcomes = outcomes;
      }

      if (type === "overunder") {
        payload.line = parseFloat(line) || 0;
        payload.unit = unit.trim() || "units";
        payload.actualValue = null;
        payload.resolutionCriteria = `Over/under ${payload.line} ${payload.unit}`;
      }

      if (type === "conditional") {
        payload.condition = condition.trim();
        payload.conditionMet = null;
        if (!payload.resolutionCriteria) {
          payload.resolutionCriteria = `Condition: ${payload.condition}`;
        }
      }

      await addDoc(
        collection(db, "events", eventId, "predictions"),
        payload
      );
      navigate(`/event/${eventId}`);
    } catch (err) {
      console.error("Error posting prediction:", err);
      alert("Failed to post prediction.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (!text.trim()) return false;
    if (type === "overunder") return !!line;
    if (type === "conditional") return !!condition.trim();
    if (type === "multi") return outcomes.length >= 2 && outcomes.every((o) => o.label.trim());
    return !!resolutionCriteria.trim();
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="text-brand font-semibold text-sm hover:text-ink-soft"
      >
        &larr; Back to Event
      </button>

      <h2 className="text-2xl font-serif italic text-ink">
        Post a Prediction
      </h2>

      <motion.form
        onSubmit={handleSubmit}
        className="card-editorial p-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Prediction type selector */}
        <div>
          <label className="block mono-label text-ink-soft mb-2">
            Prediction Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PREDICTION_TYPES.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => {
                  setType(pt.id);
                  if (pt.id !== "tagged") setTagged([]);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  type === pt.id
                    ? "bg-brand text-white border-2 border-ink shadow-[2px_2px_0_0_#181410]"
                    : "bg-cream text-ink-soft hover:bg-cream-dark border-2 border-rule-dark"
                }`}
              >
                {pt.emoji} {pt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-mute mt-2">
            {type === "open" && "Everyone can see and bet on this prediction."}
            {type === "tagged" && "Tag specific people — they won't be able to bet on it."}
            {type === "multi" && "Multiple outcomes — bettors pick which one will happen."}
            {type === "overunder" && "Set a number line — bettors pick OVER or UNDER."}
            {type === "conditional" && "Only resolves if a condition is met first."}
          </p>
        </div>

        {/* Category selector */}
        <div>
          <label className="block mono-label text-ink-soft mb-2">
            Category
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {PREDICTION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat.id
                    ? cat.color + " ring-2 ring-offset-1 ring-brand"
                    : "bg-cream text-ink-mute hover:bg-cream-dark"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member tagging for tagged type */}
        {type === "tagged" && members.length > 0 && (
          <div>
            <label className="block mono-label text-ink-soft mb-2">
              Tag members involved
            </label>
            <p className="text-xs text-ink-mute mb-2">
              Tagged members won't be able to bet on this prediction.
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const isTagged = tagged.some((t) => t.uid === m.uid);
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => toggleTag(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isTagged
                        ? "bg-brand text-white"
                        : "bg-cream text-ink-soft hover:bg-brand-bg"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Template pills */}
        {type === "tagged" && templates.length > 0 && (
          <div>
            <label className="block mono-label text-ink-soft mb-2">
              Quick templates
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map((tmpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className="bg-brand-bg text-brand text-xs font-medium px-3 py-1.5 rounded-full hover:bg-brand-soft transition-colors border border-rule-dark"
                >
                  {tmpl.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conditional form fields */}
        {type === "conditional" && (
          <div>
            <label className="block mono-label text-ink-soft mb-2">
              What's the condition?
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder='e.g. "If we go to the bar"'
              className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-mute/50"
              maxLength={100}
            />
            <p className="text-xs text-ink-mute mt-1">
              Prediction only resolves if this condition is met.
            </p>
          </div>
        )}

        {/* Over/Under form fields */}
        {type === "overunder" && (
          <div className="space-y-3">
            <div>
              <label className="block mono-label text-ink-soft mb-2">
                What are we counting?
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder='e.g. "drinks", "songs", "minutes late"'
                className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-mute/50"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block mono-label text-ink-soft mb-2">
                Set the line
              </label>
              <input
                type="number"
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder="e.g. 4.5"
                step="0.5"
                className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-mute/50"
              />
            </div>
          </div>
        )}

        {/* Prediction text */}
        <div>
          <label className="block mono-label text-ink-soft mb-2">
            What do you predict will happen?
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              type === "open"
                ? 'e.g. "Someone will lose their phone tonight"'
                : type === "tagged"
                ? 'e.g. "Jake will be the first one on the dance floor"'
                : type === "multi"
                ? 'e.g. "Who will arrive last?"'
                : type === "overunder"
                ? 'e.g. "How many drinks will Sam have?"'
                : 'e.g. "Jake will dance on a table"'
            }
            className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-mute/50 resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-ink-mute mt-1">{text.length}/200</p>
        </div>

        {/* Multi-outcome creator */}
        {type === "multi" && (
          <MultiOutcomeCreator
            outcomes={outcomes}
            setOutcomes={setOutcomes}
            members={members}
          />
        )}

        {/* Resolution criteria */}
        {type !== "overunder" && (
          <div>
            <label className="block mono-label text-ink-soft mb-2">
              How will we know this happened?
            </label>
            <textarea
              value={resolutionCriteria}
              onChange={(e) => setResolutionCriteria(e.target.value)}
              placeholder='e.g. "Verified by at least 2 witnesses" or "Photo evidence required"'
              className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-mute/50 resize-none"
              rows={2}
              maxLength={150}
            />
            <p className="text-xs text-ink-mute mt-1">
              {resolutionCriteria.length}/150
            </p>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={submitting || !canSubmit()}
          className="w-full bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410] disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {submitting ? "Posting..." : "Post Prediction"}
        </motion.button>
      </motion.form>
    </div>
  );
}
