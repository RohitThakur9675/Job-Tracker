import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, Pencil, Trash2, Users, AlertCircle } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";

function MyJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.myJobs(),
      api.getMyCompany().then(() => true).catch((err) => (err.status === 404 ? false : true)),
    ])
      .then(([jobsData, companyExists]) => {
        setJobs(jobsData);
        setHasCompany(companyExists);
      })
      .catch((err) => toast.error(err.message || "Could not load your jobs."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(job) {
    if (!window.confirm(`Delete "${job.title}"? This also removes its applications and interviews.`)) return;
    try {
      await api.deleteJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      toast.success("Job deleted.");
    } catch (err) {
      toast.error(err.message || "Could not delete this job.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Jobs</h1>
          <p className="page-subtitle">Every job you've posted, active or not.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/recruiter/jobs/new" className="btn-primary">
            <Plus size={15} /> Post a Job
          </Link>
        </div>
      </div>

      {!hasCompany && (
        <div className="auth-banner-error" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
          <AlertCircle size={15} />
          <span>
            You haven't created a company profile yet.{" "}
            <Link to="/recruiter/company" style={{ fontWeight: 700 }}>
              Create one
            </Link>{" "}
            before posting a job.
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading your jobs...
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs posted yet" message="Post your first job to start receiving applications." />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Openings</th>
                <th>Applications</th>
                <th>Posted</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>
                    <StatusPill status={job.status} />
                  </td>
                  <td className="table-cell-muted">{job.openings}</td>
                  <td className="table-cell-muted">{job.applicationsCount}</td>
                  <td className="table-cell-muted">{formatDate(job.createdAt?.slice(0, 10))}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/recruiter/jobs/${job.id}/applicants`} className="btn-ghost btn-sm btn-icon" aria-label="View applicants">
                        <Users size={14} />
                      </Link>
                      <Link to={`/recruiter/jobs/${job.id}/edit`} className="btn-ghost btn-sm btn-icon" aria-label="Edit">
                        <Pencil size={14} />
                      </Link>
                      <button type="button" className="btn-ghost btn-sm btn-icon" onClick={() => remove(job)} aria-label="Delete">
                        <Trash2 size={14} />
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

export default MyJobs;
