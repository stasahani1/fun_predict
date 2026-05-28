import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { formatCurrency } from "../utils/helpers";
import { computeAverageBrier, computeBadges } from "../utils/gamification";
import BadgeDisplay from "../components/BadgeDisplay";
import BrierScoreCard from "../components/BrierScoreCard";
import StreakDisplay from "../components/StreakDisplay";
import { motion } from "framer-motion";

export default function Profile({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Load user gamification doc
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        setUserDoc(userData);

        // Query all events where user is a member
        const eventsSnap = await getDocs(collection(db, "events"));
        const userEvents = [];

        eventsSnap.forEach((d) => {
          const data = d.data();
          if (data.members?.some((m) => m.uid === user.uid)) {
            userEvents.push({ id: d.id, ...data });
          }
        });

        let totalBets = 0;
        let totalWins = 0;
        let netWinnings = 0;
        let taggedBets = 0;
        let taggedWins = 0;
        let contrarianWins = 0;
        let maxBetsInEvent = 0;
        const eventResults = [];

        for (const evt of userEvents) {
          const balSnap = await getDocs(
            collection(db, "events", evt.id, "balances")
          );
          let userBalance = null;
          const allBalances = [];
          balSnap.forEach((d) => {
            const bal = d.data();
            allBalances.push(bal);
            if (bal.userId === user.uid) userBalance = bal;
          });

          const betsSnap = await getDocs(
            collection(db, "events", evt.id, "bets")
          );
          const predsSnap = await getDocs(
            collection(db, "events", evt.id, "predictions")
          );
          const predictions = {};
          predsSnap.forEach((d) => {
            predictions[d.id] = d.data();
          });

          let eventBetCount = 0;
          betsSnap.forEach((d) => {
            const bet = d.data();
            if (bet.userId === user.uid) {
              totalBets++;
              eventBetCount++;
              const pred = predictions[bet.predictionId];
              if (pred && pred.resolution && pred.resolution !== "void") {
                const won = pred.type === "multi"
                  ? bet.side === pred.resolution
                  : bet.side === pred.resolution;
                if (won) {
                  totalWins++;
                  // Check contrarian
                  if (pred.type === "multi") {
                    const outcomes = pred.outcomes || [];
                    const total = outcomes.reduce((s, o) => s + (o.totalBets || 0), 0);
                    const avg = total / outcomes.length;
                    const betOutcome = outcomes.find((o) => o.id === bet.side);
                    if (betOutcome && (betOutcome.totalBets || 0) < avg) {
                      contrarianWins++;
                    }
                  } else {
                    const majority = pred.totalYes > pred.totalNo ? "yes" : "no";
                    if (bet.side !== majority && pred.totalYes !== pred.totalNo) {
                      contrarianWins++;
                    }
                  }
                }
                // Tagged bets
                if (pred.type === "tagged" || (pred.taggedMembers && pred.taggedMembers.length > 0)) {
                  taggedBets++;
                  if (won) taggedWins++;
                }
              }
            }
          });

          maxBetsInEvent = Math.max(maxBetsInEvent, eventBetCount);

          if (userBalance) {
            netWinnings += userBalance.netProfit || 0;
          }

          const sorted = [...allBalances].sort(
            (a, b) => (b.netProfit || 0) - (a.netProfit || 0)
          );
          const rank = sorted.findIndex((b) => b.userId === user.uid) + 1;

          eventResults.push({
            id: evt.id,
            name: evt.name,
            phase: evt.phase,
            rank: rank || "-",
            total: allBalances.length,
            netProfit: userBalance?.netProfit || 0,
          });
        }

        const winRate = totalBets > 0 ? totalWins / totalBets : 0;

        setStats({
          totalEvents: userEvents.length,
          totalBets,
          netWinnings,
          winRate: Math.round(winRate * 100),
        });

        // Compute badges
        const badgeStats = {
          winRate,
          totalBets,
          taggedWinRate: taggedBets > 0 ? taggedWins / taggedBets : 0,
          taggedBets,
          contrarianWins,
          totalBetsAllTime: userData.totalBetsAllTime || totalBets,
          maxBetsInEvent,
        };
        setBadges(computeBadges(badgeStats));

        setEvents(
          eventResults.sort(
            (a, b) => (b.phase === "complete" ? 1 : 0) - (a.phase === "complete" ? 1 : 0)
          )
        );
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-300 border-t-purple-600" />
      </div>
    );
  }

  const memberSince = user.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const brierAvg =
    userDoc?.brierScoreCount > 0
      ? userDoc.brierScoreSum / userDoc.brierScoreCount
      : null;

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <motion.div
        className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-5 text-white text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt=""
            className="w-20 h-20 rounded-full mx-auto ring-4 ring-white/30 mb-3"
          />
        )}
        <h2 className="text-2xl font-extrabold">{user.displayName}</h2>
        {memberSince && (
          <p className="text-sm opacity-80 mt-1">Member since {memberSince}</p>
        )}
      </motion.div>

      {/* All-time stats */}
      {stats && (
        <motion.div
          className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-bold text-purple-800 mb-3">All-Time Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-purple-700 tabular-nums">
                {stats.totalEvents}
              </p>
              <p className="text-xs text-gray-500">Events</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-purple-700 tabular-nums">
                {stats.totalBets}
              </p>
              <p className="text-xs text-gray-500">Total Bets</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p
                className={`text-2xl font-extrabold tabular-nums ${
                  stats.netWinnings >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {stats.netWinnings >= 0 ? "+" : ""}
                {formatCurrency(stats.netWinnings)}
              </p>
              <p className="text-xs text-gray-500">Net Winnings</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-purple-700 tabular-nums">
                {stats.winRate}%
              </p>
              <p className="text-xs text-gray-500">Win Rate</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Brier Score Card (Batch 4) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <BrierScoreCard
          score={brierAvg}
          totalPredictions={userDoc?.brierScoreCount || 0}
        />
      </motion.div>

      {/* Streak Display (Batch 4) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StreakDisplay
          currentStreak={userDoc?.currentStreak || 0}
          longestStreak={userDoc?.longestStreak || 0}
        />
      </motion.div>

      {/* Badges (Batch 4) */}
      <motion.div
        className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="font-bold text-purple-800 mb-3">Badges</h3>
        <BadgeDisplay earnedBadges={badges} large />
      </motion.div>

      {/* Event history */}
      {events.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-bold text-purple-800 mb-3">Event History</h3>
          <div className="space-y-2">
            {events.map((evt, i) => (
              <motion.button
                key={evt.id}
                onClick={() => navigate(`/event/${evt.id}`)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-purple-50 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {evt.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {evt.phase === "complete" ? "Completed" : evt.phase}
                  </p>
                </div>
                <div className="text-right">
                  {evt.phase === "complete" && (
                    <>
                      <p className="text-sm font-bold text-purple-700">
                        #{evt.rank}
                        <span className="text-gray-400 font-normal">
                          /{evt.total}
                        </span>
                      </p>
                      <p
                        className={`text-xs font-medium tabular-nums ${
                          evt.netProfit >= 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {evt.netProfit >= 0 ? "+" : ""}
                        {formatCurrency(evt.netProfit)}
                      </p>
                    </>
                  )}
                  {evt.phase !== "complete" && (
                    <span className="text-xs text-purple-500 font-medium">
                      In progress
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">{"\uD83C\uDFAE"}</p>
          <p>No events yet. Create or join one to get started!</p>
        </div>
      )}
    </div>
  );
}
