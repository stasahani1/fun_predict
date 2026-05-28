import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { generateJoinCode } from "../utils/helpers";
import { motion } from "framer-motion";

export default function CreateEvent({ user }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [startingBalance, setStartingBalance] = useState(100);
  const [creating, setCreating] = useState(false);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    loadMyEvents();
  }, [user.uid]);

  const loadMyEvents = async () => {
    try {
      const q = query(collection(db, "events"));
      const snap = await getDocs(q);
      const events = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.members?.some((m) => m.uid === user.uid)) {
          events.push({ id: d.id, ...data });
        }
      });
      events.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyEvents(events);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const code = generateJoinCode();
      const eventRef = await addDoc(collection(db, "events"), {
        name: name.trim(),
        creatorId: user.uid,
        creatorName: user.displayName || "Anonymous",
        code,
        phase: "posting",
        members: [{ uid: user.uid, name: user.displayName || "Anonymous" }],
        currency: "fun_bucks",
        startingBalance,
        createdAt: serverTimestamp(),
      });

      // Initialize creator's balance
      await setDoc(
        doc(db, "events", eventRef.id, "balances", user.uid),
        {
          userId: user.uid,
          userName: user.displayName || "Anonymous",
          balance: startingBalance,
          netProfit: 0,
        }
      );

      navigate(`/event/${eventRef.id}`);
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Failed to create event. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif italic text-ink mb-1">
          Hey {user.displayName?.split(" ")[0]}!
        </h2>
        <p className="text-ink-mute">Create a new event or jump into one below.</p>
      </div>

      <motion.form
        onSubmit={handleCreate}
        className="card-editorial p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="block mono-label text-ink-soft mb-2">
          Event Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Friday Night Out"'
          className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-mute/50"
          maxLength={60}
        />
        <label className="block mono-label text-ink-soft mb-2 mt-4">
          Starting Balance ($)
        </label>
        <div className="flex items-center gap-3">
          {[50, 100, 200, 500].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setStartingBalance(amt)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                startingBalance === amt
                  ? "bg-brand text-white border-2 border-ink shadow-[2px_2px_0_0_#181410]"
                  : "bg-cream text-ink-soft hover:bg-cream-dark border-2 border-rule-dark"
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={startingBalance}
          onChange={(e) => setStartingBalance(Math.max(10, Number(e.target.value)))}
          className="w-full px-4 py-3 rounded-xl border-2 border-rule-dark focus:outline-none focus:ring-2 focus:ring-brand text-ink mt-2"
          min={10}
        />
        <p className="text-xs text-ink-mute mt-1">
          Each player starts with this many fun bucks. Min $10.
        </p>
        <motion.button
          type="submit"
          disabled={creating || !name.trim()}
          className="mt-4 w-full bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410] disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {creating ? "Creating..." : "Create Event"}
        </motion.button>
      </motion.form>

      {/* My Events */}
      <div>
        <h3 className="font-bold text-ink mb-3">Your Events</h3>
        {loadingEvents ? (
          <div className="text-center py-8 text-ink-mute">Loading...</div>
        ) : myEvents.length === 0 ? (
          <div className="text-center py-8 text-ink-mute card-editorial">
            <p className="text-4xl mb-2">🎈</p>
            <p>No events yet. Create one or join with a code!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myEvents.map((event, i) => (
              <motion.button
                key={event.id}
                onClick={() => navigate(`/event/${event.id}`)}
                className="w-full card-editorial p-4 text-left hover:shadow-[6px_6px_0_0_#181410] transition-shadow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-ink">{event.name}</h4>
                    <p className="text-xs text-ink-mute">
                      {event.members?.length || 1} members &middot; Code:{" "}
                      <span className="font-mono font-bold text-brand">
                        {event.code}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`mono-label px-3 py-1 rounded-full ${
                      event.phase === "complete"
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-bg text-brand"
                    }`}
                  >
                    {event.phase}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
