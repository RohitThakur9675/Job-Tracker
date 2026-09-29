import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, Globe, MapPin, Users, ArrowLeft } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import JobCard from "../../components/JobCard";
import CompanyLogo from "../../components/CompanyLogo";
import EmptyState from "../../components/EmptyState";
import "./CompanyDetails.css";

function CompanyDetails() {
  const { id } = useParams();
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    Promise.all([api.getCompany(id), api.listJobs({ company: id })])
      .then(([companyData, jobsData]) => {
        setCompany(companyData);
        setJobs(jobsData.jobs || []);
      })
      .catch((err) => {
        if (err.status === 404) setNotFound(true);
        else toast.error(err.message || "Could not load this company.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading company...
        </div>
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="page page-narrow">
        <p className="page-title">Company not found</p>
        <Link to="/companies" className="btn-secondary" style={{ marginTop: 16, display: "inline-flex" }}>
          <ArrowLeft size={15} /> Back to companies
        </Link>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <Link to="/companies" className="btn-ghost btn-sm" style={{ marginBottom: 16, display: "inline-flex" }}>
        <ArrowLeft size={15} /> All companies
      </Link>

      <div className="company-details-header panel panel-padded">
        <CompanyLogo company={company} size={64} />
        <div>
          <h1 className="job-details-title">
            {company.name} {company.isVerified && <span className="verified-badge">Verified</span>}
          </h1>
          <div className="job-card-meta" style={{ marginTop: 8 }}>
            {company.industry && <span>{company.industry}</span>}
            {company.location && (
              <span>
                <MapPin size={13} /> {company.location}
              </span>
            )}
            {company.size && (
              <span>
                <Users size={13} /> {company.size}
              </span>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                <Globe size={13} /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      {company.description && (
        <div className="panel panel-padded" style={{ marginTop: 16 }}>
          <h2 className="section-title">About</h2>
          <p className="job-details-description">{company.description}</p>
        </div>
      )}

      <h2 className="section-title" style={{ marginTop: 24 }}>
        Open positions ({jobs.length})
      </h2>
      {jobs.length === 0 ? (
        <EmptyState icon={Building2} title="No open positions right now" message="Check back later for new openings." />
      ) : (
        <div className="list-stack">
          {jobs.map((job) => (
            <JobCard key={job.id} job={{ ...job, company }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CompanyDetails;
