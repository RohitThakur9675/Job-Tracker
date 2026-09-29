import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Search, X, Eye, Download } from "lucide-react";
import { api, openBlob, downloadBlob } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import "./MyApplications.css";

const TABS = ["All", "Applied", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];

function MyApplications() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  function load() {
    setLoading(true);
    api
      .myApplications()
      .then(setApplications)
      .catch((err) => toast.error(err.message || "Could not load your applications."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (tab !== "All" && app.status !== tab) return false;
      if (!query.trim()) return true;
      const haystack = `${app.job?.title || ""} ${app.job?.company?.name || ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [applications, tab, query]);

  async function viewResume(applicationId) {
    try {
      const { blob } = await api.viewApplicationResume(applicationId);
      openBlob(blob);
    } catch (err) {
      toast.error(err.message || "Could not open this resume.");
    }
  }

  async function downloadResume(applicationId) {
    try {
      const { blob, filename } = await api.downloadApplicationResume(applicationId);
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || "Could not download this resume.");
    }
  }

  async function withdraw(id) {
    if (!window.confirm("Withdraw this application? This can't be undone.")) return;
    try {
      await api.withdrawApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setSelected(null);
      toast.success("Application withdrawn.");
    } catch (err) {
      toast.error(err.message || "Could not withdraw this application.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Applications</h1>
          <p className="page-subtitle">Track the status of every job you've applied to.</p>
        </div>
      </div>

      <div className="apps-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`apps-tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="filter-search" style={{ maxWidth: 360, marginBottom: 16 }}>
        <Search size={16} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by job or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading applications...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No applications found" message="Applications you submit will show up here." />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Company</th>
                <th>Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className="app-table-row-clickable" onClick={() => setSelected(app)}>
                  <td>{app.job?.title || "—"}</td>
                  <td className="table-cell-muted">{app.job?.company?.name || "—"}</td>
                  <td className="table-cell-muted">{formatDate(app.appliedDate)}</td>
                  <td>
                    <StatusPill status={app.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={selected.job?.title || "Application"} onClose={() => setSelected(null)}>
          <div className="apps-detail-meta">
            <p>
              <strong>Company:</strong> {selected.job?.company?.name || "—"}
            </p>
            <p>
              <strong>Applied:</strong> {formatDate(selected.appliedDate)}
            </p>
            <p>
              <strong>Status:</strong> <StatusPill status={selected.status} />
            </p>
            {selected.resumeSnapshot && (
              <p>
                <strong>Resume:</strong> {selected.resumeSnapshot.originalName}{" "}
                <button type="button" className="btn-ghost btn-sm" onClick={() => viewResume(selected.id)}>
                  <Eye size={13} /> View
                </button>{" "}
                <button type="button" className="btn-ghost btn-sm" onClick={() => downloadResume(selected.id)}>
                  <Download size={13} /> Download
                </button>
              </p>
            )}
            {selected.coverNote && (
              <p>
                <strong>Cover note:</strong> {selected.coverNote}
              </p>
            )}
          </div>
          <div className="form-actions">
            {selected.job?.id && (
              <Link to={`/jobs/${selected.job.id}`} className="btn-secondary">
                View job
              </Link>
            )}
            {selected.status === "Applied" && (
              <button type="button" className="btn-danger" onClick={() => withdraw(selected.id)}>
                <X size={14} /> Withdraw
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MyApplications;
