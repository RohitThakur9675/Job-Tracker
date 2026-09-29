import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import EmptyState from "../../components/EmptyState";

function Companies() {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .adminListCompanies()
      .then(setCompanies)
      .catch((err) => toast.error(err.message || "Could not load companies."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleVerified(company) {
    try {
      const updated = await api.adminVerifyCompany(company.id, !company.isVerified);
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(updated.isVerified ? "Company verified." : "Verification removed.");
    } catch (err) {
      toast.error(err.message || "Could not update this company.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">All company profiles on the platform.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies yet" />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Source</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="table-person">
                      <div className="table-avatar">
                        {c.logo ? <img src={c.logo} alt={c.name} /> : <Building2 size={14} />}
                      </div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="table-cell-muted">{c.industry || "—"}</td>
                  <td className="table-cell-muted">{c.location || "—"}</td>
                  <td>
                    <span className="role-badge">{c.addedByAdmin ? "Admin-added" : "Recruiter"}</span>
                  </td>
                  <td>{c.isVerified && <span className="verified-badge">Verified</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => toggleVerified(c)}>
                      {c.isVerified ? "Unverify" : "Verify"}
                    </button>
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

export default Companies;
