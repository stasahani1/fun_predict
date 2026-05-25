import { Navigate } from "react-router-dom";

// Login is handled by Landing page's Google Sign-In.
// This component exists as a redirect target.
export default function Login() {
  return <Navigate to="/" replace />;
}
