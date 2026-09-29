import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Video, Phone, MapPin as MapPinIcon } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatTime } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";
import "./MyInterviews.css";

const TYPE_ICON = { Video, Phone, "In-person": MapPinIcon };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function InterviewCard({ iv }) {
  const TypeIcon = TYPE_ICON[iv.interviewType] || Video;
  return (
    <div className="interview-card panel panel-padded">
      <div className="interview-card-top">
        <div>
          <p className="dash-row-title">{iv.job?.title}</p>
          <p className="dash-row-subtitle">{iv.job?.company?.name}</p>
        </div>
        <StatusPill status={iv.status} />
      </div>
      <div className="job-card-meta" style={{ marginTop: 12 }}>
        <span>
          <CalendarDays size={13} /> {formatDate(iv.interviewDate)} · {formatTime(iv.interviewTime)}
        </span>
        <span>
          <TypeIcon size={13} /> {iv.interviewType}
        </span>
      </div>
      {iv.notes && <p className="interview-notes">{iv.notes}</p>}
      {iv.status === "Scheduled" && iv.interviewType === "Video" && iv.meetingLink && (
        <Link to={iv.meetingLink} className="btn-primary interview-join-btn">
          <Video size={14} /> Join Video Interview
        </Link>
      )}
    </div>
  );
}

function MyInterviews() {
  const toast = useToast();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .myInterviews()
      .then(setInterviews)
      .catch((err) => toast.error(err.message || "Could not load your interviews."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading interviews...
        </div>
      </div>
    );
  }

  const upcoming = interviews.filter((iv) => iv.interviewDate >= todayISO() && iv.status === "Scheduled");
  const past = interviews.filter((iv) => !(iv.interviewDate >= todayISO() && iv.status === "Scheduled"));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Interviews</h1>
          <p className="page-subtitle">Every interview scheduled for your applications.</p>
        </div>
      </div>

      {interviews.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No interviews yet" message="When a recruiter schedules an interview, it'll show up here." />
      ) : (
        <>
          <h2 className="section-title">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="table-cell-muted" style={{ marginBottom: 24 }}>
              No upcoming interviews.
            </p>
          ) : (
            <div className="card-grid cols-2" style={{ marginBottom: 28 }}>
              {upcoming.map((iv) => (
                <InterviewCard key={iv.id} iv={iv} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="section-title">Past</h2>
              <div className="card-grid cols-2">
                {past.map((iv) => (
                  <InterviewCard key={iv.id} iv={iv} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MyInterviews;
