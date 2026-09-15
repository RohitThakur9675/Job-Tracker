import "./Sidebar.css";
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Building2,
  BarChart3,
  Settings,
  HelpCircle,
  X,
} from "lucide-react";
import { useJobs } from "../context/JobsContext";

const menuItems = [
  { key: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { key: "applications", name: "Applications", icon: Briefcase },
  { key: "interviews", name: "Interviews", icon: CalendarDays },
  { key: "companies", name: "Companies", icon: Building2 },
  { key: "analytics", name: "Analytics", icon: BarChart3 },
];

function Sidebar({ open, onClose, activePage, onNavigate }) {
  const { applications } = useJobs();

  function go(key) {
    onNavigate?.(key);
    onClose?.();
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Briefcase size={18} strokeWidth={2} />
            </div>
            <div>
              <h1 className="sidebar-title">JobTrack</h1>
              <p className="sidebar-subtitle">Career workspace</p>
            </div>
          </div>

          <button onClick={onClose} className="sidebar-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <p className="sidebar-group-label">Workspace</p>

          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.key;

              return (
                <button
                  key={item.key}
                  className={`nav-item ${isActive ? "is-active" : ""}`}
                  onClick={() => go(item.key)}
                >
                  <span className="nav-item-icon">
                    <Icon size={17} strokeWidth={isActive ? 2.1 : 1.7} />
                  </span>
                  <span>{item.name}</span>

                  {item.key === "applications" && (
                    <span className="nav-item-badge">{applications.length}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <p className="sidebar-group-label is-second">General</p>

          <nav className="sidebar-nav">
            <button className="nav-item">
              <span className="nav-item-icon">
                <Settings size={17} strokeWidth={1.7} />
              </span>
              Settings
            </button>

            <button className="nav-item">
              <span className="nav-item-icon">
                <HelpCircle size={17} strokeWidth={1.7} />
              </span>
              Help &amp; Support
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar">RT</div>
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">Rohit Thakur</p>
                <p className="sidebar-user-role">Job Seeker</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
