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

export default function PostPrediction({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [type, setType] = useState("open");
  const [members, setMembers] = useState([]);
  const [tagged, setTagged] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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

  const toggleTag = (member) => {
    setTagged((prev) =>
      prev.some((m) => m.uid === member.uid)
        ? prev.filter((m) => m.uid !== member.uid)
        : [...prev, member]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, "events", eventId, "predictions"), {
        text: text.trim(),
        type,
        creatorId: user.uid,
        creatorName: user.displayName || "Anonymous",
        taggedMembers: type === "tagged" ? tagged : [],
        resolution: null,
        totalYes: 0,
        totalNo: 0,
        createdAt: serverTimestamp(),
      });
      navigate(`/event/${eventId}`);
    } catch (err) {
      console.error("Error posting prediction:", err);
      alert("Failed to post prediction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="text-purple-500 font-semibold text-sm hover:text-purple-700"
      >
        &larr; Back to Event
      </button>

      <h2 className="text-2xl font-extrabold text-purple-800">
        Post a Prediction
      </h2>

      <motion.form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Prediction type selector */}
        <div>
          <label className="block text-sm font-semibold text-purple-700 mb-2">
            Prediction Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setType("open"); setTagged([]); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                type === "open"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              🌍 Open
            </button>
            <button
              type="button"
              onClick={() => setType("tagged")}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                type === "tagged"
                  ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              🏷️ Tagged
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {type === "open"
              ? "Everyone can see and bet on this prediction."
              : "Tag specific people — they won't be able to bet on it."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-purple-700 mb-2">
            What do you predict will happen?
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              type === "open"
                ? 'e.g. "Someone will lose their phone tonight"'
                : 'e.g. "Jake will be the first one on the dance floor"'
            }
            className="w-full px-4 py-3 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 placeholder:text-gray-300 resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-gray-400 mt-1">{text.length}/200</p>
        </div>

        {type === "tagged" && members.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-purple-700 mb-2">
              Tag members involved
            </label>
            <p className="text-xs text-gray-400 mb-2">
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
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-purple-100"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={submitting || !text.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-full shadow-lg disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {submitting ? "Posting..." : "Post Prediction"}
        </motion.button>
      </motion.form>
    </div>
  );
}
