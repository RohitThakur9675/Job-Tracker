import "./StatusPill.css";

const TONE_BY_STATUS = {
  Applied: "blue",
  Shortlisted: "purple",
  "Interview Scheduled": "amber",
  Selected: "emerald",
  Rejected: "rose",
  Active: "emerald",
  Closed: "muted",
  Draft: "amber",
  Scheduled: "blue",
  Completed: "emerald",
  Cancelled: "rose",
  Rescheduled: "amber",
};

function StatusPill({ status }) {
  const tone = TONE_BY_STATUS[status] || "muted";
  return <span className={`status-pill status-pill-${tone}`}>{status}</span>;
}

export default StatusPill;
