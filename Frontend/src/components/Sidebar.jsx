import "./Sidebar.css";
import { NavLink, Link } from "react-router-dom";
import { HOME_ROUTE } from "./RouteGuards";
import {
  LayoutDashboard,
  Search,
  Briefcase,
  Heart,
  CalendarDays,
  Bell,
  UserRound,
  Settings as SettingsIcon,
  Building2,
  PlusCircle,
  Users,
  FileText,
  Flag,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import CreatorBadge from "./CreatorBadge";

const MENUS = {
  jobseeker: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/jobs", label: "Browse Jobs", icon: Search },
    { to: "/applications", label: "My Applications", icon: Briefcase },
    { to: "/saved-jobs", label: "Saved Jobs", icon: Heart },
    { to: "/interviews", label: "My Interviews", icon: CalendarDays },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/recruiter/company", label: "Company Profile", icon: Building2 },
    { to: "/recruiter/jobs", label: "My Jobs", icon: Briefcase },
    { to: "/recruiter/jobs/new", label: "Post a Job", icon: PlusCircle },
    { to: "/recruiter/interviews", label: "Interviews", icon: CalendarDays },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/companies", label: "Companies", icon: Building2 },
    { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
    { to: "/admin/applications", label: "Applications", icon: FileText },
    { to: "/admin/reports", label: "Reported Jobs", icon: Flag },
  ],
};

const ROLE_LABEL = { jobseeker: "Job Seeker", recruiter: "Recruiter", admin: "Admin" };

function navItemClass({ isActive }) {
  return `nav-item ${isActive ? "is-active" : ""}`;
}

function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const menu = MENUS[user.role] || [];
  const profileRoute = user.role === "jobseeker" ? "/profile" : user.role === "recruiter" ? "/recruiter/profile" : "/admin/dashboard";
  const name = user.name || "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";

  return (
    <>
      <div className={`sidebar-overlay ${open ? "is-open" : ""}`} onClick={onClose} />

      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <Link to={profileRoute} className="sidebar-brand" onClick={onClose} title="Open your profile">
            <div className="sidebar-logo">
              <Briefcase size={18} strokeWidth={2} />
            </div>
            <div>
              <h1 className="sidebar-title">JobTrack</h1>
              <p className="sidebar-subtitle">{ROLE_LABEL[user.role]} workspace</p>
            </div>
          </Link>
          <button onClick={onClose} className="sidebar-close-btn" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-creator-strip">
          <CreatorBadge />
        </div>

        <div className="sidebar-scroll">
          <p className="sidebar-group-label">Workspace</p>
          <nav className="sidebar-nav">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={navItemClass}>
                  <span className="nav-item-icon">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <p className="sidebar-group-label is-second">General</p>
          <nav className="sidebar-nav">
            {user.role !== "admin" && (
              <NavLink to="/notifications" onClick={onClose} className={navItemClass}>
                <span className="nav-item-icon">
                  <Bell size={17} strokeWidth={1.8} />
                </span>
                <span>Notifications</span>
                {unreadCount > 0 && <span className="nav-item-badge">{unreadCount}</span>}
              </NavLink>
            )}
            {user.role === "jobseeker" && (
              <NavLink to="/profile" onClick={onClose} className={navItemClass}>
                <span className="nav-item-icon">
                  <UserRound size={17} strokeWidth={1.8} />
                </span>
                <span>Profile</span>
              </NavLink>
            )}
            {user.role === "recruiter" && (
              <NavLink to="/recruiter/profile" onClick={onClose} className={navItemClass}>
                <span className="nav-item-icon">
                  <UserRound size={17} strokeWidth={1.8} />
                </span>
                <span>My Profile</span>
              </NavLink>
            )}
            <NavLink to="/settings" onClick={onClose} className={navItemClass}>
              <span className="nav-item-icon">
                <SettingsIcon size={17} strokeWidth={1.8} />
              </span>
              <span>Settings</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <NavLink to={user.role === "jobseeker" ? "/profile" : user.role === "recruiter" ? "/recruiter/profile" : "/settings"} className="sidebar-user-card" onClick={onClose}>
              {user.profilePhoto ? (
                <img className="sidebar-user-avatar sidebar-user-avatar-image" src={user.profilePhoto} alt={name} />
              ) : (
                <div className="sidebar-user-avatar">{initials}</div>
              )}
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{name}</p>
                <p className="sidebar-user-role">{ROLE_LABEL[user.role]}</p>
              </div>
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
