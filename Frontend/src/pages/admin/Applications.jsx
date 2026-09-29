import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";

function Applications() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .adminListApplications()
      .then(setApplications)
      .catch((err) => toast.error(err.message || "Could not load applications."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Every application submitted across the platform.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <EmptyState icon={FileText} title="No applications yet" />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Job</th>
                <th>Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div>
                      <p className="dash-row-title">{app.applicant?.name}</p>
                      <p className="dash-row-subtitle">{app.applicant?.email}</p>
                    </div>
                  </td>
                  <td className="table-cell-muted">{app.job?.title || "—"}</td>
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
    </div>
  );
}

export default Applications;
