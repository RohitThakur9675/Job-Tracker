import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flag } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import EmptyState from "../../components/EmptyState";

function Reports() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .adminReportedJobs()
      .then(setJobs)
      .catch((err) => toast.error(err.message || "Could not load reported jobs."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function dismiss(job) {
    try {
      await api.adminDismissReport(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      toast.success("Report dismissed.");
    } catch (err) {
      toast.error(err.message || "Could not dismiss this report.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reported Jobs</h1>
          <p className="page-subtitle">Listings job seekers have flagged as suspicious or fake.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading reports...
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Flag} title="No reported jobs" message="Nothing needs your attention right now." />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Company</th>
                <th>Reports</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td className="table-cell-muted">{job.company?.name || "—"}</td>
                  <td>
                    <span className="admin-badge">{job.reportCount} report{job.reportCount === 1 ? "" : "s"}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/jobs/${job.id}`} className="btn-secondary btn-sm">
                        View job
                      </Link>
                      <button type="button" className="btn-danger btn-sm" onClick={() => dismiss(job)}>
                        Dismiss
                      </button>
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

export default Reports;
