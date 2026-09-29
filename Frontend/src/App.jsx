import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { RequireAuth, RequireRole, RedirectIfAuthed, HOME_ROUTE } from "./components/RouteGuards";

import AdaptiveLayout from "./layouts/AdaptiveLayout";
import PublicLayout from "./layouts/PublicLayout";
import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";

import Home from "./pages/public/Home";
import Jobs from "./pages/public/Jobs";
import JobDetails from "./pages/public/JobDetails";
import Companies from "./pages/public/Companies";
import CompanyDetails from "./pages/public/CompanyDetails";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import SeekerDashboard from "./pages/seeker/Dashboard";
import Profile from "./pages/seeker/Profile";
import CandidateProfile from "./pages/seeker/CandidateProfile";
import MyApplications from "./pages/seeker/MyApplications";
import SavedJobs from "./pages/seeker/SavedJobs";
import MyInterviews from "./pages/seeker/MyInterviews";

import RecruiterDashboard from "./pages/recruiter/Dashboard";
import CompanyProfile from "./pages/recruiter/CompanyProfile";
import RecruiterProfile from "./pages/recruiter/RecruiterProfile";
import MyJobs from "./pages/recruiter/MyJobs";
import JobForm from "./pages/recruiter/JobForm";
import Applicants from "./pages/recruiter/Applicants";
import RecruiterInterviews from "./pages/recruiter/Interviews";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCompanies from "./pages/admin/Companies";
import AdminJobs from "./pages/admin/Jobs";
import AdminApplications from "./pages/admin/Applications";
import AdminReports from "./pages/admin/Reports";

import Notifications from "./pages/shared/Notifications";
import Settings from "./pages/shared/Settings";
import Meeting from "./pages/Meeting";

function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <span className="loading-spinner-sm" />
    </div>
  );
}

function ServerProblemScreen({ message, onRetry }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 14, padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 360 }}>
        Couldn't reach the server. {message}
      </p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

// A logged-in user still hits "/" sometimes (bookmark, typed URL) — send them to
// their own dashboard instead of the marketing homepage.
function HomeOrRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to={HOME_ROUTE[user.role]} replace />;
  return <Home />;
}

function NotFoundRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? HOME_ROUTE[user.role] : "/"} replace />;
}

function AppRoutes() {
  const { ready, authError, retryAuth } = useAuth();

  if (authError) return <ServerProblemScreen message={authError} onRetry={retryAuth} />;
  if (!ready) return <LoadingScreen />;

  return (
    <Routes>
      {/* Browsable by anyone — the shell adapts to whether you're logged in. */}
      <Route element={<AdaptiveLayout />}>
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetails />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomeOrRedirect />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <Register />
            </RedirectIfAuthed>
          }
        />
      </Route>

      <Route element={<RequireAuth />}>
        {/* No AppLayout here on purpose — a video call wants the full screen,
            not the dashboard sidebar/navbar. Both candidate and recruiter land
            here, so it isn't under a RequireRole either. */}
        <Route path="/meeting/:meetingId" element={<Meeting />} />

        <Route element={<AppLayout />}>
          <Route path="/candidate/:id" element={<CandidateProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />

          <Route element={<RequireRole role="jobseeker" />}>
            <Route path="/dashboard" element={<SeekerDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/applications" element={<MyApplications />} />
            <Route path="/saved-jobs" element={<SavedJobs />} />
            <Route path="/interviews" element={<MyInterviews />} />
          </Route>

          <Route element={<RequireRole role="recruiter" />}>
            <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
            <Route path="/recruiter/company" element={<CompanyProfile />} />
            <Route path="/recruiter/profile" element={<RecruiterProfile />} />
            <Route path="/recruiter/jobs" element={<MyJobs />} />
            <Route path="/recruiter/jobs/new" element={<JobForm />} />
            <Route path="/recruiter/jobs/:id/edit" element={<JobForm />} />
            <Route path="/recruiter/jobs/:id/applicants" element={<Applicants />} />
            <Route path="/recruiter/interviews" element={<RecruiterInterviews />} />
          </Route>

          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationsProvider>
          <AppRoutes />
        </NotificationsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
