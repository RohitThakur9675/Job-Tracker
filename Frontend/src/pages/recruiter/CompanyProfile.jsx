import { useEffect, useState } from "react";
import { Building2, Globe, MapPin, Users } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import "../seeker/Profile.css";

const EMPTY = { name: "", logo: "", description: "", website: "", industry: "", location: "", size: "" };

function CompanyProfile() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    api
      .getMyCompany()
      .then((company) => {
        setForm({ ...EMPTY, ...company });
        setIsVerified(company.isVerified);
        setHasProfile(true);
      })
      .catch((err) => {
        if (err.status !== 404) toast.error(err.message || "Could not load your company profile.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const saved = await api.saveMyCompany(form);
      setForm({ ...EMPTY, ...saved });
      setIsVerified(saved.isVerified);
      setHasProfile(true);
      toast.success("Company profile saved.");
    } catch (err) {
      toast.error(err.message || "Could not save your company profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Company Profile {isVerified && <span className="verified-badge">Verified</span>}
          </h1>
          <p className="page-subtitle">
            {hasProfile ? "Update how your company appears to job seekers." : "Create your company profile before posting jobs."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel panel-padded">
        <div className="profile-photo-row">
          {form.logo ? (
            <img src={form.logo} alt={form.name} className="profile-photo-preview" style={{ borderRadius: 12 }} />
          ) : (
            <div className="profile-photo-placeholder" style={{ borderRadius: 12 }}>
              <Building2 size={22} />
            </div>
          )}
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label" htmlFor="c-logo">
              Logo URL
            </label>
            <input id="c-logo" type="url" className="form-input" value={form.logo} onChange={(e) => update("logo", e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="c-name">
            Company name
          </label>
          <input id="c-name" type="text" className="form-input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="c-description">
            About the company
          </label>
          <textarea id="c-description" className="form-textarea" value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>

        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="c-industry">
              Industry
            </label>
            <input id="c-industry" type="text" className="form-input" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-size">
              <Users size={13} style={{ verticalAlign: -2 }} /> Company size
            </label>
            <input
              id="c-size"
              type="text"
              className="form-input"
              placeholder="e.g. 51-200 employees"
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
            />
          </div>
        </div>

        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="c-location">
              <MapPin size={13} style={{ verticalAlign: -2 }} /> Location
            </label>
            <input id="c-location" type="text" className="form-input" value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-website">
              <Globe size={13} style={{ verticalAlign: -2 }} /> Website
            </label>
            <input id="c-website" type="url" className="form-input" value={form.website} onChange={(e) => update("website", e.target.value)} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save company profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CompanyProfile;
