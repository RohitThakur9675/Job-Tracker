import "./Navbar.css";
import { Search, Bell, Menu, ChevronDown, Moon, Sun, LogOut, UserRound, Settings as SettingsIcon, Briefcase } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";

function Navbar({ onMenuClick }) {
  const { user, logout, updateProfile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const name = user?.name || "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";
  const isDark = user?.theme === "dark";
  const profileRoute = user?.role === "jobseeker"
    ? "/profile"
    : user?.role === "recruiter"
      ? "/recruiter/profile"
      : "/admin/dashboard";

  function submitSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/jobs?q=${encodeURIComponent(query.trim())}`);
  }

  function openMyProfile() {
    setProfileOpen(false);
    navigate(profileRoute);
  }

  function logoutAndGoHome() {
    setProfileOpen(false);
    logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <button onClick={onMenuClick} className="navbar-menu-btn" aria-label="Open navigation">
        <Menu size={21} />
      </button>

      {/* JobTrack branding opens the logged-in user's own profile. */}
      <button type="button" className="navbar-brand" onClick={openMyProfile} aria-label="Open my JobTrack profile">
        <span className="navbar-brand-logo"><Briefcase size={15} /></span>
        <span>JobTrack</span>
      </button>

      {user?.role === "jobseeker" && (
        <form className="navbar-search" onSubmit={submitSearch}>
          <span className="navbar-search-icon"><Search size={18} /></span>
          <input
            type="text"
            placeholder="Search jobs, skills, companies..."
            className="navbar-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      )}

      <div className="navbar-right">
        <button
          type="button"
          className="navbar-icon-btn"
          onClick={() => updateProfile({ theme: isDark ? "light" : "dark" })}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user?.role !== "admin" && (
          <button className="navbar-bell-btn" aria-label="Notifications" onClick={() => navigate("/notifications")}>
            <Bell size={19} />
            {unreadCount > 0 && <span className="navbar-bell-dot" />}
          </button>
        )}

        <div className="navbar-divider" />

        <div className="navbar-profile-wrap">
          <button
            className="navbar-profile-btn"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-label="Open account menu"
          >
            {user?.profilePhoto ? (
              <img className="navbar-avatar navbar-avatar-image" src={user.profilePhoto} alt={name} />
            ) : (
              <div className="navbar-avatar">{initials}</div>
            )}
            <span className="navbar-username">{name.split(" ")[0] || "Account"}</span>
            <span className="navbar-chevron"><ChevronDown size={15} /></span>
          </button>

          {profileOpen && (
            <div className="navbar-profile-menu">
              <button type="button" onClick={openMyProfile}>
                <UserRound size={15} /> My profile
              </button>
              <button type="button" onClick={() => { setProfileOpen(false); navigate("/settings"); }}>
                <SettingsIcon size={15} /> Account settings
              </button>
              <button type="button" onClick={logoutAndGoHome}>
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
