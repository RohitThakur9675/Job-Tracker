import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, UserPlus, ThumbsUp, ThumbsDown, CalendarDays, CalendarClock, Trophy, CheckCheck } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationsContext";
import { formatRelative } from "../../utils/formatDate";
import EmptyState from "../../components/EmptyState";
import "./Notifications.css";

const TYPE_ICON = {
  new_applicant: UserPlus,
  application_shortlisted: ThumbsUp,
  application_rejected: ThumbsDown,
  interview_scheduled: CalendarDays,
  interview_updated: CalendarClock,
  candidate_selected: Trophy,
};

function Notifications() {
  const toast = useToast();
  const { refresh } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listNotifications()
      .then(setNotifications)
      .catch((err) => toast.error(err.message || "Could not load notifications."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(n) {
    if (n.isRead) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      await api.markNotificationRead(n.id);
      refresh();
    } catch {
      // non-critical — the badge will settle on the next poll either way
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.markAllNotificationsRead();
      refresh();
      toast.success("All notifications marked as read.");
    } catch (err) {
      toast.error(err.message || "Could not mark all as read.");
    }
  }

  const linkFor = (n) => {
    if (n.relatedJob) return `/jobs/${n.relatedJob}`;
    return null;
  };

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button type="button" className="btn-ghost btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" message="We'll let you know when something happens." />
      ) : (
        <div className="notif-list">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const to = linkFor(n);
            const row = (
              <div className={`notif-row ${n.isRead ? "" : "is-unread"}`} onClick={() => markRead(n)}>
                <div className="notif-icon">
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="notif-title">{n.title}</p>
                  <p className="notif-message">{n.message}</p>
                  <p className="notif-time">{formatRelative(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="notif-dot" />}
              </div>
            );
            return to ? (
              <Link key={n.id} to={to} className="notif-link">
                {row}
              </Link>
            ) : (
              <div key={n.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;
