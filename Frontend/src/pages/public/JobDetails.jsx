import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Briefcase,
  IndianRupee,
  Calendar,
  Building2,
  Heart,
  Flag,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import Modal from "../../components/Modal";
import StatusPill from "../../components/StatusPill";
import CompanyLogo from "../../components/CompanyLogo";
import "./JobDetails.css";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function salaryLabel(job) {
  if (!job.salaryMin && !job.salaryMax) return "Not disclosed";
  const fmt = (n) => `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)} / year`;
  return `${fmt(job.salaryMin || job.salaryMax)} / year`;
}

function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .getJob(id)
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role !== "jobseeker") return;
    Promise.all([api.listSavedJobs(), api.myApplications()])
      .then(([savedRows, applications]) => {
        setSaved(savedRows.some((r) => r.job?.id === id));
        setApplied(applications.some((application) => application.job?.id === id));
      })
      .catch(() => {});
  }, [id, user]);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.saveJob(id);
      else await api.unsaveJob(id);
    } catch (err) {
      setSaved(!next);
      toast.error(err.message || "Could not update saved jobs.");
    }
  }

  async function submitApplication() {
    setApplying(true);
    try {
      await api.applyToJob({ jobId: id, coverNote });
      setApplied(true);
      setShowApplyModal(false);
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err.message || "Could not submit your application.");
    } finally {
      setApplying(false);
    }
  }

  async function report() {
    if (!window.confirm("Report this job listing as suspicious or fake?")) return;
    try {
      await api.reportJob(id);
      toast.success("Thanks — this job has been reported.");
    } catch (err) {
      toast.error(err.message || "Could not report this job.");
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading job...
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="page page-narrow">
        <p className="page-title">Job not found</p>
        <p className="page-subtitle">This listing may have been removed or closed.</p>
        <Link to="/jobs" className="btn-secondary" style={{ marginTop: 16, display: "inline-flex" }}>
          <ArrowLeft size={15} /> Back to jobs
        </Link>
      </div>
    );
  }

  const company = job.company || {};
  const accepting = job.status === "Active" && (!job.applicationDeadline || job.applicationDeadline >= todayISO());
  const isExternal = job.applicationType === "External";

  return (
    <div className="page page-narrow">
      <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="job-details-header panel panel-padded">
        <div className="job-details-top">
          <CompanyLogo company={company} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="job-details-title">{job.title}</h1>
            {company.id ? (
              <Link to={`/companies/${company.id}`} className="job-details-company-link">
                {company.name}
              </Link>
            ) : (
              <p className="job-details-company-link">{company.name || "Company"}</p>
            )}
          </div>
          {user?.role === "jobseeker" && (
            <button
              type="button"
              className={`job-card-save ${saved ? "is-saved" : ""}`}
              onClick={toggleSave}
              aria-label={saved ? "Unsave job" : "Save job"}
            >
              <Heart size={18} fill={saved ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        <div className="job-card-meta" style={{ marginTop: 16 }}>
          {job.location && (
            <span>
              <MapPin size={13} /> {job.location}
            </span>
          )}
          <span>
            <Briefcase size={13} /> {job.workMode} · {job.employmentType}
          </span>
          <span>
            <IndianRupee size={13} /> {salaryLabel(job)}
          </span>
          {job.applicationDeadline && (
            <span>
              <Calendar size={13} /> Apply by {formatDate(job.applicationDeadline)}
            </span>
          )}
        </div>

        <div className="job-details-status-row">
          <StatusPill status={job.status} />
          {!accepting && <span className="table-cell-muted">No longer accepting applications</span>}
        </div>

        <div className="job-details-apply-row">
          {isExternal ? (
            <a href={job.externalApplyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Apply on Company Website <ExternalLink size={15} />
            </a>
          ) : !user ? (
            <Link to="/login" state={{ from: location }} className="btn-primary">
              Log in to Apply
            </Link>
          ) : user.role !== "jobseeker" ? (
            <p className="table-cell-muted">Only job seeker accounts can apply to jobs.</p>
          ) : applied ? (
            <span className="verified-badge">Application submitted</span>
          ) : (
            <button type="button" className="btn-primary" disabled={!accepting} onClick={() => setShowApplyModal(true)}>
              Apply Now
            </button>
          )}

          {user?.role === "jobseeker" && (
            <button type="button" className="btn-ghost btn-sm" onClick={report}>
              <Flag size={14} /> Report
            </button>
          )}
        </div>
      </div>

      <div className="job-details-body panel panel-padded">
        <h2 className="section-title">Job description</h2>
        <p className="job-details-description">{job.description}</p>

        {job.requiredSkills?.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: 24 }}>
              Required skills
            </h2>
            <div className="chip-row">
              {job.requiredSkills.map((skill) => (
                <span key={skill} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </>
        )}

        <h2 className="section-title" style={{ marginTop: 24 }}>
          Openings
        </h2>
        <p className="table-cell-muted">{job.openings} position{job.openings === 1 ? "" : "s"} available</p>
      </div>

      {showApplyModal && (
        <Modal title={`Apply to ${job.title}`} onClose={() => setShowApplyModal(false)}>
          <div className="apps-detail-meta" style={{ marginBottom: 14 }}>
            <p>
              <strong>Resume:</strong>{" "}
              {user.resume ? user.resume.originalName : <span className="table-cell-muted">No resume on file</span>}
            </p>
            {!user.resume && (
              <p className="table-cell-muted">
                Please upload your resume before applying.{" "}
                <Link to="/profile" onClick={() => setShowApplyModal(false)}>
                  Upload now
                </Link>
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cover-note">
              Cover note (optional)
            </label>
            <textarea
              id="cover-note"
              className="form-textarea"
              placeholder="Tell the recruiter why you're a good fit..."
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={submitApplication} disabled={applying || !user.resume}>
              {applying ? "Submitting..." : "Submit application"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default JobDetails;
