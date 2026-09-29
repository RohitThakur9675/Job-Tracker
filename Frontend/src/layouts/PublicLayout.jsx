import { Link, Outlet } from "react-router-dom";
import { Briefcase } from "lucide-react";
import CreatorBadge from "../components/CreatorBadge";
import "./PublicLayout.css";

function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link to="/" className="public-brand">
          <span className="public-brand-logo">
            <Briefcase size={18} strokeWidth={2} />
          </span>
          JobTrack
        </Link>
        <CreatorBadge />
        <nav className="public-nav">
          <Link to="/jobs">Find Jobs</Link>
          <Link to="/companies">Companies</Link>
        </nav>
        <div className="public-header-actions">
          <Link to="/login" className="btn-secondary btn-sm">
            Log in
          </Link>
          <Link to="/register" className="btn-primary btn-sm">
            Sign up
          </Link>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>
          © {new Date().getFullYear()} JobTrack · Built by Rohit — a learning project, not a real job board.
        </p>
      </footer>
    </div>
  );
}

export default PublicLayout;
