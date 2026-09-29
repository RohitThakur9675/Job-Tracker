import "./QuickActions.css";
import { Plus, CalendarDays, Building2, BarChart3, ChevronRight } from "lucide-react";

function QuickActions({ onNavigate, onAddClick }) {
  const actions = [
    {
      title: "Add New Application",
      subtitle: "Track a new job opportunity",
      icon: Plus,
      badgeClass: "badge-indigo",
      onClick: onAddClick,
    },
    {
      title: "View Interviews",
      subtitle: "See your interview schedule",
      icon: CalendarDays,
      badgeClass: "badge-blue",
      onClick: () => onNavigate?.("interviews"),
    },
    {
      title: "Manage Companies",
      subtitle: "Keep track of your target companies",
      icon: Building2,
      badgeClass: "badge-emerald",
      onClick: () => onNavigate?.("companies"),
    },
    {
      title: "View Analytics",
      subtitle: "See your progress and insights",
      icon: BarChart3,
      badgeClass: "badge-amber",
      onClick: () => onNavigate?.("analytics"),
    },
  ];

  return (
    <div className="panel panel-padded-lg">
      <h2 className="card-title">Quick Actions</h2>

      <div className="action-list">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button key={action.title} className="action-item" onClick={action.onClick}>
              <div className={`icon-badge ${action.badgeClass}`} style={{ width: 40, height: 40 }}>
                <Icon size={18} />
              </div>

              <div className="action-info">
                <p className="action-title">{action.title}</p>
                <p className="action-subtitle">{action.subtitle}</p>
              </div>

              <span className="action-chevron">
                <ChevronRight size={16} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;
