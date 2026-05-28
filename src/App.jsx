import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import CreateEvent from "./pages/CreateEvent";
import JoinEvent from "./pages/JoinEvent";
import EventDashboard from "./pages/EventDashboard";
import PostPrediction from "./pages/PostPrediction";
import BettingView from "./pages/BettingView";
import ResolveView from "./pages/ResolveView";
import Results from "./pages/Results";
import Profile from "./pages/Profile";
import SweatView from "./pages/SweatView";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-300 border-t-purple-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/home" replace /> : <Landing />}
      />
      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<Layout user={user} />}>
          <Route path="/home" element={<CreateEvent user={user} />} />
          <Route path="/join" element={<JoinEvent user={user} />} />
          <Route path="/event/:eventId" element={<EventDashboard user={user} />} />
          <Route path="/event/:eventId/post" element={<PostPrediction user={user} />} />
          <Route path="/event/:eventId/bet" element={<BettingView user={user} />} />
          <Route path="/event/:eventId/resolve" element={<ResolveView user={user} />} />
          <Route path="/event/:eventId/live" element={<SweatView user={user} />} />
          <Route path="/event/:eventId/results" element={<Results user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
