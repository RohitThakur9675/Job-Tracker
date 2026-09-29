import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Video, XCircle, CheckCircle2 } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatTime } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";

function Interviews() {
  const toast = useToast();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .recruiterInterviews()
      .then(setInterviews)
      .catch((err) => toast.error(err.message || "Could not load interviews."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(iv, status) {
    try {
      await api.updateInterview(iv.id, { status });
      setInterviews((prev) => prev.map((i) => (i.id === iv.id ? { ...i, status } : i)));
      toast.success(`Marked as ${status}.`);
    } catch (err) {
      toast.error(err.message || "Could not update this interview.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interviews</h1>
          <p className="page-subtitle">Every interview you've scheduled across your job postings.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading interviews...
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No interviews scheduled" message="Schedule one from a job's applicants list." />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Date &amp; Time</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.id}>
                  <td>
                    <div className="table-person">
                      <div className="table-avatar">
                        {iv.candidate?.profilePhoto ? (
                          <img src={iv.candidate.profilePhoto} alt={iv.candidate.name} />
                        ) : (
                          (iv.candidate?.name || "?").slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span>{iv.candidate?.name}</span>
                    </div>
                  </td>
                  <td className="table-cell-muted">{iv.job?.title}</td>
                  <td className="table-cell-muted">
                    {formatDate(iv.interviewDate)} · {formatTime(iv.interviewTime)}
                  </td>
                  <td className="table-cell-muted">{iv.interviewType}</td>
                  <td>
                    <StatusPill status={iv.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      {iv.status === "Scheduled" && iv.interviewType === "Video" && iv.meetingLink && (
                        <Link to={iv.meetingLink} className="btn-ghost btn-sm btn-icon" aria-label="Join video interview">
                          <Video size={14} />
                        </Link>
                      )}
                      {iv.status === "Scheduled" && (
                        <>
                          <button
                            type="button"
                            className="btn-ghost btn-sm btn-icon"
                            onClick={() => updateStatus(iv, "Completed")}
                            aria-label="Mark completed"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm btn-icon"
                            onClick={() => updateStatus(iv, "Cancelled")}
                            aria-label="Cancel"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Interviews;
