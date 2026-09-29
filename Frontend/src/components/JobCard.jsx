import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MapPin, Briefcase, IndianRupee, Heart } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import CompanyLogo from "./CompanyLogo";
import "./JobCard.css";

function salaryLabel(job) {
  if (!job.salaryMin && !job.salaryMax) return null;
  const fmt = (n) => `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`;
  return fmt(job.salaryMin || job.salaryMax);
}

function JobCard({ job, saved, onToggleSave }) {
  const { user } = useAuth();
  const company = job.company || {};
  const salary = salaryLabel(job);

  return (
    <div className="job-card panel panel-padded">
      <div className="job-card-top">
        <Link to={company.id ? `/companies/${company.id}` : `/jobs/${job.id}`} aria-label={`Open ${company.name || "company"} profile`} onClick={(e) => e.stopPropagation()}>
          <CompanyLogo company={company} size={48} className="job-card-logo" />
        </Link>
        <div className="job-card-heading">
          <Link to={`/jobs/${job.id}`} className="job-card-title">
            {job.title}
          </Link>
          <Link to={company.id ? `/companies/${company.id}` : `/jobs/${job.id}`} className="job-card-company" onClick={(e) => e.stopPropagation()}>{company.name || "Company"}</Link>
        </div>
        {onToggleSave && (
          <button
            type="button"
            className={`job-card-save ${saved ? "is-saved" : ""}`}
            onClick={() => onToggleSave(job)}
            aria-label={saved ? "Unsave job" : "Save job"}
          >
            <Heart size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      <div className="job-card-meta">
        {job.location && (
          <span>
            <MapPin size={13} /> {job.location}
          </span>
        )}
        <span>
          <Briefcase size={13} /> {job.workMode} · {job.employmentType}
        </span>
        {salary && (
          <span>
            <IndianRupee size={13} /> {salary}
          </span>
        )}
      </div>

      {company.website && (
        <div style={{ marginTop: 10 }}>
          <a href={company.website} target="_blank" rel="noopener noreferrer" className="card-link" onClick={(e) => e.stopPropagation()}>
            Company website ↗
          </a>
        </div>
      )}

      {job.requiredSkills?.length > 0 && (
        <div className="job-card-skills">
          {job.requiredSkills.slice(0, 5).map((skill) => (
            <span key={skill} className="job-card-skill">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="job-card-footer">
        <span className="job-card-date">Posted {formatDate(job.createdAt?.slice(0, 10))}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to={`/jobs/${job.id}`} className="card-link">
            View details →
          </Link>
          {user?.role === "jobseeker" && job.status === "Active" && (
            <Link to={`/jobs/${job.id}`} className="btn-primary btn-sm">Apply now</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobCard;
