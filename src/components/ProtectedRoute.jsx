import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ user }) {
  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}
