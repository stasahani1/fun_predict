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
        <h2 className="text-2xl font-extrabold text-purple-800 mb-1">
          Hey {user.displayName?.split(" ")[0]}!
        </h2>
        <p className="text-gray-500">Create a new event or jump into one below.</p>
      </div>

      <motion.form
        onSubmit={handleCreate}
        className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="block text-sm font-semibold text-purple-700 mb-2">
          Event Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Friday Night Out"'
          className="w-full px-4 py-3 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 placeholder:text-gray-300"
          maxLength={60}
        />
        <label className="block text-sm font-semibold text-purple-700 mb-2 mt-4">
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
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
          className="w-full px-4 py-3 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 mt-2"
          min={10}
        />
        <p className="text-xs text-gray-400 mt-1">
          Each player starts with this many fun bucks. Min $10.
        </p>
        <motion.button
          type="submit"
          disabled={creating || !name.trim()}
          className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-full shadow-lg disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {creating ? "Creating..." : "Create Event"}
        </motion.button>
      </motion.form>

      {/* My Events */}
      <div>
        <h3 className="font-bold text-purple-800 mb-3">Your Events</h3>
        {loadingEvents ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : myEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-purple-100">
            <p className="text-4xl mb-2">🎈</p>
            <p>No events yet. Create one or join with a code!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myEvents.map((event, i) => (
              <motion.button
                key={event.id}
                onClick={() => navigate(`/event/${event.id}`)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-purple-100 text-left hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{event.name}</h4>
                    <p className="text-xs text-gray-400">
                      {event.members?.length || 1} members &middot; Code:{" "}
                      <span className="font-mono font-bold text-purple-500">
                        {event.code}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      event.phase === "complete"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
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
