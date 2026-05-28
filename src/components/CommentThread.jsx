import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CommentThread({ eventId, predictionId, user }) {
  const [comments, setComments] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(
        db,
        "events",
        eventId,
        "predictions",
        predictionId,
        "comments"
      ),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setComments(items);
    });
    return unsub;
  }, [eventId, predictionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(
        collection(
          db,
          "events",
          eventId,
          "predictions",
          predictionId,
          "comments"
        ),
        {
          userId: user.uid,
          userName: user.displayName || "Anonymous",
          userPhotoURL: user.photoURL || "",
          text: text.trim(),
          createdAt: serverTimestamp(),
        }
      );
      setText("");
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-purple-500 font-medium hover:text-purple-700 transition-colors"
      >
        {"\uD83D\uDCAC"} {comments.length} comment{comments.length !== 1 ? "s" : ""}
        {expanded ? " \u25B4" : " \u25BE"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 items-start"
                >
                  {comment.userPhotoURL ? (
                    <img
                      src={comment.userPhotoURL}
                      alt=""
                      className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-purple-700">
                        {comment.userName?.[0] || "?"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {comment.userName?.split(" ")[0]}
                      </span>
                      <span className="text-xs text-gray-300">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 break-words">
                      {comment.text}
                    </p>
                  </div>
                </motion.div>
              ))}

              {comments.length === 0 && (
                <p className="text-xs text-gray-400 py-1">
                  No comments yet. Be the first!
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
                maxLength={280}
                className="flex-1 text-sm px-3 py-2 rounded-full border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 placeholder:text-gray-300"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50 hover:bg-purple-600 transition-colors"
              >
                {submitting ? "..." : "Send"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
