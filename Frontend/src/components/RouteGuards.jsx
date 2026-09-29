import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Where each role lands right after logging in, or when it hits a route it can't use.
export const HOME_ROUTE = {
  jobseeker: "/dashboard",
  recruiter: "/recruiter/dashboard",
  admin: "/admin/dashboard",
};

// App.jsx already shows a full-screen loader until auth is "ready", so by the time
// these render we always know for sure whether `user` exists.
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// Restricts a subtree of routes to one role; anyone else is sent to their own home
// instead of a dead end — e.g. a job seeker hitting /admin/dashboard lands on /dashboard.
export function RequireRole({ role }) {
  const { user } = useAuth();
  if (user.role !== role) return <Navigate to={HOME_ROUTE[user.role]} replace />;
  return <Outlet />;
}

// Wraps /login and /register so an already-logged-in user is bounced to their dashboard.
export function RedirectIfAuthed({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={HOME_ROUTE[user.role]} replace />;
  return children;
}
