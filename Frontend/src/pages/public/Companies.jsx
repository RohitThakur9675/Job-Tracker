import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, MapPin } from "lucide-react";
import CompanyLogo from "../../components/CompanyLogo";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import EmptyState from "../../components/EmptyState";
import "./Companies.css";

function Companies() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .listCompanies({ q: query })
        .then(setCompanies)
        .catch((err) => toast.error(err.message || "Could not load companies."))
        .finally(() => setLoading(false));
    }, 300); // small debounce so every keystroke doesn't fire a request
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies hiring on JobTrack</h1>
          <p className="page-subtitle">Browse company profiles before you apply.</p>
        </div>
      </div>

      <div className="filter-search" style={{ maxWidth: 420, marginBottom: 22 }}>
        <Search size={16} />
        <input
          type="text"
          className="form-input"
          placeholder="Search companies by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies found" message="Try a different search term." />
      ) : (
        <div className="card-grid cols-2">
          {companies.map((c) => (
            <Link key={c.id} to={`/companies/${c.id}`} className="company-card panel panel-padded">
              <CompanyLogo company={c} size={48} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="company-card-name">
                  {c.name} {c.isVerified && <span className="verified-badge">Verified</span>}
                </p>
                {c.industry && <p className="company-card-industry">{c.industry}</p>}
                {c.location && (
                  <p className="company-card-location">
                    <MapPin size={12} /> {c.location}
                  </p>
                )}
                <p className="company-card-location">
                  <Building2 size={12} /> {c.activeJobsCount || 0} open position{c.activeJobsCount === 1 ? "" : "s"}
                </p>
                {c.website && (
                  <p className="company-card-location"><a href={c.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Company website ↗</a></p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Companies;
