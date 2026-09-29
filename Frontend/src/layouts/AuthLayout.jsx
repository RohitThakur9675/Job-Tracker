import { Link, Outlet } from "react-router-dom";
import { Briefcase, Users, Building2, ShieldCheck } from "lucide-react";
import "./AuthLayout.css";

function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-logo">
            <Briefcase size={20} strokeWidth={2} />
          </span>
          JobTrack
        </Link>
        <h1 className="auth-brand-heading">Find your next role, or your next hire.</h1>
        <ul className="auth-brand-points">
          <li>
            <Users size={16} /> Job seekers building their careers
          </li>
          <li>
            <Building2 size={16} /> Companies posting real openings
          </li>
          <li>
            <ShieldCheck size={16} /> Applications and interviews, all in one place
          </li>
        </ul>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
