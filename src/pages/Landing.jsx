import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/home");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream relative overflow-hidden">
      {/* Subtle gradient blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-bg opacity-60 blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-brand-soft opacity-40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center relative z-10"
      >
        <motion.h1
          className="text-7xl hunch-wordmark text-ink mb-2"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          hunch<span className="hunch-dot">.</span>
        </motion.h1>
        <p className="text-ink-soft text-lg mb-10 max-w-xs mx-auto">
          Bet on your friends. Predict the chaos. Win bragging rights.
        </p>

        <motion.button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="bg-brand text-white font-bold text-lg px-8 py-4 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410] hover:shadow-[6px_6px_0_0_#181410] transition-all disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#fff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#fff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#fff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#fff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </span>
          )}
        </motion.button>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 bg-red-100 px-4 py-2 rounded-xl mt-4 text-sm border border-red-200"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 grid grid-cols-3 gap-4 text-center text-ink-mute relative z-10"
      >
        <div className="mono-label">
          <span className="text-2xl block mb-1">🎲</span>
          Predict
        </div>
        <div className="mono-label">
          <span className="text-2xl block mb-1">💰</span>
          Bet
        </div>
        <div className="mono-label">
          <span className="text-2xl block mb-1">🏆</span>
          Win
        </div>
      </motion.div>
    </div>
  );
}
