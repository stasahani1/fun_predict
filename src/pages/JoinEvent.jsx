import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "framer-motion";

export default function JoinEvent({ user }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Enter a 6-character code.");
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const q = query(collection(db, "events"), where("code", "==", trimmed));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("No event found with that code.");
        setJoining(false);
        return;
      }

      const eventDoc = snap.docs[0];
      const eventData = eventDoc.data();

      // Check if already a member
      if (eventData.members?.some((m) => m.uid === user.uid)) {
        navigate(`/event/${eventDoc.id}`);
        return;
      }

      const memberEntry = {
        uid: user.uid,
        name: user.displayName || "Anonymous",
      };

      // Add member to event
      await updateDoc(doc(db, "events", eventDoc.id), {
        members: arrayUnion(memberEntry),
      });

      // Initialize balance
      const balRef = doc(db, "events", eventDoc.id, "balances", user.uid);
      const balSnap = await getDoc(balRef);
      if (!balSnap.exists()) {
        await setDoc(balRef, {
          userId: user.uid,
          userName: user.displayName || "Anonymous",
          balance: eventData.startingBalance || 100,
          netProfit: 0,
        });
      }

      navigate(`/event/${eventDoc.id}`);
    } catch (err) {
      console.error("Error joining event:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-purple-800 mb-1">
          Join an Event
        </h2>
        <p className="text-gray-500">Enter the 6-character code from your friend.</p>
      </div>

      <motion.form
        onSubmit={handleJoin}
        className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="block text-sm font-semibold text-purple-700 mb-2">
          Event Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="ABC123"
          className="w-full px-4 py-4 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-center text-2xl font-mono font-bold tracking-widest text-purple-700 placeholder:text-gray-300"
          maxLength={6}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm mt-2"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={joining || code.trim().length !== 6}
          className="mt-4 w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold py-3 rounded-full shadow-lg disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {joining ? "Joining..." : "Join Event"}
        </motion.button>
      </motion.form>
    </div>
  );
}
