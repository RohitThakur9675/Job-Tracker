import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, X, MapPin } from "lucide-react";
import AutocompleteInput, { LOCATION_OPTIONS, SKILL_OPTIONS, JOB_TITLE_OPTIONS } from "../../components/AutocompleteInput";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import "./JobForm.css";

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];
const STATUSES = ["Draft", "Active", "Closed"];

const EMPTY = {
  title: "",
  description: "",
  requiredSkills: [],
  salaryMin: "",
  salaryMax: "",
  location: "",
  workMode: "Remote",
  employmentType: "Full-time",
  experienceMin: "",
  experienceMax: "",
  openings: 1,
  applicationDeadline: "",
  status: "Draft",
  applicationType: "Internal",
  externalApplyUrl: "",
};

function JobForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getJob(id)
      .then((job) => setForm({ ...EMPTY, ...job, salaryMin: job.salaryMin ?? "", salaryMax: job.salaryMax ?? "" }))
      .catch((err) => toast.error(err.message || "Could not load this job."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  function removeSkill(skill) {
    setForm((prev) => ({ ...prev, requiredSkills: prev.requiredSkills.filter((s) => s !== skill) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      salaryMin: form.salaryMin === "" ? undefined : Number(form.salaryMin),
      salaryMax: form.salaryMax === "" ? undefined : Number(form.salaryMax),
      experienceMin: form.experienceMin === "" ? 0 : Number(form.experienceMin),
      experienceMax: form.experienceMax === "" ? undefined : Number(form.experienceMax),
      openings: Number(form.openings) || 1,
    };

    try {
      if (isEdit) {
        await api.updateJob(id, payload);
        toast.success("Job updated.");
      } else {
        await api.createJob(payload);
        toast.success("Job posted.");
      }
      navigate("/recruiter/jobs");
    } catch (err) {
      toast.error(err.message || "Could not save this job.");
    } finally {
      setSaving(false);
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

  return (
    <div className="page page-narrow">
      <Link to="/recruiter/jobs" className="btn-ghost btn-sm" style={{ marginBottom: 16, display: "inline-flex" }}>
        <ArrowLeft size={15} /> My Jobs
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "Edit Job" : "Post a Job"}</h1>
          <p className="page-subtitle">{isEdit ? "Update this listing's details." : "Fill in the details for your new opening."}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel panel-padded">
        <h3 className="form-section-title">Basics</h3>
        <div className="form-group">
          <label className="form-label" htmlFor="j-title">
            Job title
          </label>
          <input id="j-title" type="text" className="form-input" required value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="j-description">
            Job description
          </label>
          <textarea
            id="j-description"
            className="form-textarea"
            style={{ minHeight: 160 }}
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Required skills</label>
          <div className="tag-input-box">
            {form.requiredSkills.map((skill) => (
              <span key={skill} className="tag-chip">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
            <AutocompleteInput
              value={skillInput}
              onChange={setSkillInput}
              options={SKILL_OPTIONS.filter((skill) => !form.requiredSkills.some((selected) => selected.toLowerCase() === skill.toLowerCase()))}
              placeholder="Search a skill, then press Enter"
              onSelect={(value) => {
                const normalized = value.trim();
                if (!normalized) return;
                setForm((prev) => ({ ...prev, requiredSkills: [...prev.requiredSkills, normalized] }));
                setSkillInput("");
              }}
              onEnter={(value) => {
                const normalized = value.trim();
                if (!normalized) return;
                setForm((prev) => {
                  const exists = prev.requiredSkills.some((skill) => skill.toLowerCase() === normalized.toLowerCase());
                  return exists ? prev : { ...prev, requiredSkills: [...prev.requiredSkills, normalized] };
                });
                setSkillInput("");
              }}
              className="skill-autocomplete-input"
            />
          </div>
        </div>

        <h3 className="form-section-title">Details</h3>
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
            <label className="form-label" htmlFor="j-location">
              Location
            </label>
            <AutocompleteInput
              value={form.location}
              onChange={(value) => update("location", value)}
              options={LOCATION_OPTIONS}
              placeholder="e.g. Gurgaon, Haryana"
              icon={<MapPin size={14} className="autocomplete-leading-icon" />}
            />
          </div>
        </div>

        <div className="form-row cols-3">
          <div className="form-group">
            <label className="form-label" htmlFor="j-exp-min">
              Min experience (years)
            </label>
            <input
              id="j-exp-min"
              type="number"
              min="0"
              className="form-input"
              value={form.experienceMin}
              onChange={(e) => update("experienceMin", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="j-exp-max">
              Max experience (years)
            </label>
            <input
              id="j-exp-max"
              type="number"
              min="0"
              className="form-input"
              value={form.experienceMax}
              onChange={(e) => update("experienceMax", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="j-openings">
              Number of openings
            </label>
            <input
              id="j-openings"
              type="number"
              min="1"
              required
              className="form-input"
              value={form.openings}
              onChange={(e) => update("openings", e.target.value)}
            />
          </div>
        </div>

        <div className="form-row cols-3">
          <div className="form-group">
            <label className="form-label" htmlFor="j-salary-min">
              Min salary (₹/year)
            </label>
            <input
              id="j-salary-min"
              type="number"
              min="0"
              className="form-input"
              value={form.salaryMin}
              onChange={(e) => update("salaryMin", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="j-salary-max">
              Max salary (₹/year)
            </label>
            <input
              id="j-salary-max"
              type="number"
              min="0"
              className="form-input"
              value={form.salaryMax}
              onChange={(e) => update("salaryMax", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="j-deadline">
              Application deadline
            </label>
            <input
              id="j-deadline"
              type="date"
              className="form-input"
              value={form.applicationDeadline}
              onChange={(e) => update("applicationDeadline", e.target.value)}
            />
          </div>
        </div>

        <h3 className="form-section-title">Applications</h3>
        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label">Application type</label>
            <select className="form-select" value={form.applicationType} onChange={(e) => update("applicationType", e.target.value)}>
              <option value="Internal">Internal (apply on JobTrack)</option>
              <option value="External">External (apply on company site)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="form-hint">Only "Active" jobs are visible in search and accept applications.</p>
          </div>
        </div>

        {form.applicationType === "External" && (
          <div className="form-group">
            <label className="form-label" htmlFor="j-external-url">
              External apply URL
            </label>
            <input
              id="j-external-url"
              type="url"
              className="form-input"
              required
              placeholder="https://company.com/careers/apply"
              value={form.externalApplyUrl}
              onChange={(e) => update("externalApplyUrl", e.target.value)}
            />
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Post job"}
          </button>
          <Link to="/recruiter/jobs" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default JobForm;
