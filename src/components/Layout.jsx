import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { motion } from "framer-motion";

const navItems = [
  { path: "/home", label: "Home", icon: "\uD83C\uDFE0" },
  { path: "/join", label: "Join", icon: "\uD83D\uDD17" },
  { path: "/profile", label: "Profile", icon: "\uD83D\uDC64" },
];

export default function Layout({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b-2 border-ink">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-2xl hunch-wordmark cursor-pointer"
            onClick={() => navigate("/home")}
          >
            hunch<span className="hunch-dot">.</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-soft hidden sm:block">
              {user?.displayName?.split(" ")[0]}
            </span>
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full ring-2 ring-rule-dark"
              />
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-ink-mute hover:text-brand font-semibold"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-t-2 border-ink">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
                  active
                    ? "text-brand"
                    : "text-ink-mute hover:text-brand"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
