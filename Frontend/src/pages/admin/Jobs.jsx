import { useEffect, useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];

const EMPTY_FORM = {
  companyName: "",
  title: "",
  description: "",
  requiredSkills: [],
  location: "",
  workMode: "Remote",
  employmentType: "Full-time",
  openings: 1,
  salaryMin: "",
  salaryMax: "",
  status: "Active",
  applicationType: "Internal",
  externalApplyUrl: "",
};

function Jobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .adminListJobs()
      .then(setJobs)
      .catch((err) => toast.error(err.message || "Could not load jobs."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addSkill() {
    const value = skillInput.trim();
    if (!value || form.requiredSkills.includes(value)) {
      setSkillInput("");
      return;
    }
    setForm((prev) => ({ ...prev, requiredSkills: [...prev.requiredSkills, value] }));
    setSkillInput("");
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.adminCreateJob({
        ...form,
        salaryMin: form.salaryMin === "" ? undefined : Number(form.salaryMin),
        salaryMax: form.salaryMax === "" ? undefined : Number(form.salaryMax),
        openings: Number(form.openings) || 1,
      });
      toast.success("Job added.");
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.message || "Could not add this job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">Every job posted on the platform.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Add Job Manually
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs yet" />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Status</th>
                <th>Openings</th>
                <th>Posted</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td className="table-cell-muted">{job.company?.name || "—"}</td>
                  <td>
                    <StatusPill status={job.status} />
                  </td>
                  <td className="table-cell-muted">{job.openings}</td>
                  <td className="table-cell-muted">{formatDate(job.createdAt?.slice(0, 10))}</td>
                  <td>
                    {job.isAdminPosted && <span className="admin-badge">Admin-posted</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Add a job manually" onClose={() => setShowForm(false)} wide>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Company name</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. TCS"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
              />
              <p className="form-hint">If this company doesn't exist yet, it will be created automatically.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Job title</label>
              <input type="text" className="form-input" required value={form.title} onChange={(e) => update("title", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" required value={form.description} onChange={(e) => update("description", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Required skills</label>
              <div className="tag-input-box">
                {form.requiredSkills.map((skill) => (
                  <span key={skill} className="tag-chip">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, requiredSkills: p.requiredSkills.filter((s) => s !== skill) }))}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Type a skill and press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
              </div>
            </div>
            <div className="form-row cols-3">
              <div className="form-group">
                <label className="form-label">Work mode</label>
                <select className="form-select" value={form.workMode} onChange={(e) => update("workMode", e.target.value)}>
                  {WORK_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Employment type</label>
                <select className="form-select" value={form.employmentType} onChange={(e) => update("employmentType", e.target.value)}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Openings</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={form.openings}
                  onChange={(e) => update("openings", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input type="text" className="form-input" value={form.location} onChange={(e) => update("location", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Min salary (₹/year)</label>
                <input type="number" min="0" className="form-input" value={form.salaryMin} onChange={(e) => update("salaryMin", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max salary (₹/year)</label>
                <input type="number" min="0" className="form-input" value={form.salaryMax} onChange={(e) => update("salaryMax", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Application type</label>
              <select className="form-select" value={form.applicationType} onChange={(e) => update("applicationType", e.target.value)}>
                <option value="Internal">Internal (apply on JobTrack)</option>
                <option value="External">External (apply on company site)</option>
              </select>
            </div>
            {form.applicationType === "External" && (
              <div className="form-group">
                <label className="form-label">External apply URL</label>
                <input
                  type="url"
                  className="form-input"
                  required
                  value={form.externalApplyUrl}
                  onChange={(e) => update("externalApplyUrl", e.target.value)}
                />
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Adding..." : "Add job"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Jobs;
