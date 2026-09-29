import { useRef, useState } from "react";
import {
  User as UserIcon,
  Phone,
  MapPin,
  Link as LinkIcon,
  FileText,
  Upload,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import AutocompleteInput, { SKILL_OPTIONS } from "../../components/AutocompleteInput";
import { api, openBlob, downloadBlob } from "../../utils/api";
import { formatTimestampDate } from "../../utils/formatDate";
import Modal from "../../components/Modal";
import "./Profile.css";

const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_EDUCATION = { degree: "", institution: "", startYear: "", endYear: "", description: "" };
const EMPTY_PROJECT = { title: "", description: "", link: "" };

function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.76.84 1.23 1.91 1.23 3.22 0 4.62-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9h4v12H3V9Zm7 0h3.83v1.64h.05c.53-1 1.83-2.06 3.77-2.06C21.69 8.58 22 11.07 22 14.3V21h-4v-5.93c0-1.41-.03-3.22-1.96-3.22-1.96 0-2.26 1.53-2.26 3.12V21h-4V9Z" />
    </svg>
  );
}
const EMPTY_EXPERIENCE = { title: "", company: "", startDate: "", endDate: "", current: false, description: "" };

function Profile() {
  const { user, updateProfile, setFullUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    location: user.location || "",
    profilePhoto: user.profilePhoto || "",
    about: user.about || "",
    linkedin: user.linkedin || "",
    github: user.github || "",
    portfolio: user.portfolio || "",
  });
  const [skills, setSkills] = useState(user.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [eduModal, setEduModal] = useState(null); // { id?, ...EMPTY_EDUCATION }
  const [expModal, setExpModal] = useState(null);
  const [projectModal, setProjectModal] = useState(null); // { id?, ...EMPTY_PROJECT }

  const resumeInputRef = useRef(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeDeleting, setResumeDeleting] = useState(false);
  const resumeBusy = resumeUploading || resumeDeleting;

  const photoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  function pickPhotoFile() {
    photoInputRef.current?.click();
  }

  async function onPhotoFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be re-selected later (e.g. after a failed upload)
    if (!file) return;

    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      toast.error("Profile photo must be a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("That image is too large. Photos must be under 3 MB.");
      return;
    }

    setPhotoUploading(true);
    try {
      const { user: updated } = await api.uploadPhoto(file);
      setFullUser(updated);
      update("profilePhoto", updated.profilePhoto);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err.message || "Could not upload your photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function removePhoto() {
    setPhotoUploading(true);
    try {
      const { user: updated } = await api.deletePhoto();
      setFullUser(updated);
      update("profilePhoto", "");
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove your photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function pickResumeFile() {
    resumeInputRef.current?.click();
  }

  async function onResumeFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be re-selected later (e.g. after a failed upload)
    if (!file) return;

    const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      toast.error("Resumes must be a PDF file.");
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      toast.error("That file is too large. Resumes must be under 5 MB.");
      return;
    }

    setResumeUploading(true);
    try {
      const { user: updated } = await api.uploadResume(file);
      setFullUser(updated);
      toast.success("Resume uploaded.");
    } catch (err) {
      toast.error(err.message || "Could not upload your resume.");
    } finally {
      setResumeUploading(false);
    }
  }

  async function viewResume() {
    try {
      const { blob } = await api.viewResume();
      openBlob(blob);
    } catch (err) {
      toast.error(err.message || "Could not open your resume.");
    }
  }

  async function downloadResume() {
    try {
      const { blob, filename } = await api.downloadResume();
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || "Could not download your resume.");
    }
  }

  async function deleteResumeFile() {
    if (!window.confirm("Delete your resume? You'll need to upload a new one before applying to jobs.")) return;
    setResumeDeleting(true);
    try {
      const { user: updated } = await api.deleteResume();
      setFullUser(updated);
      toast.success("Resume deleted.");
    } catch (err) {
      toast.error(err.message || "Could not delete your resume.");
    } finally {
      setResumeDeleting(false);
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function removeSkill(skill) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  async function saveBasicInfo(e) {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({ ...form, skills });
    setSaving(false);
    if (result.ok) toast.success("Profile updated.");
    else toast.error(result.error || "Could not update your profile.");
  }

  async function saveEducation(e) {
    e.preventDefault();
    try {
      const { id, ...entry } = eduModal;
      const payload = {
        ...entry,
        startYear: entry.startYear ? Number(entry.startYear) : undefined,
        endYear: entry.endYear ? Number(entry.endYear) : undefined,
      };
      const { user: updated } = id ? await api.updateEducation(id, payload) : await api.addEducation(payload);
      setFullUser(updated);
      setEduModal(null);
      toast.success("Education saved.");
    } catch (err) {
      toast.error(err.message || "Could not save education.");
    }
  }

  async function deleteEducation(id) {
    if (!window.confirm("Remove this education entry?")) return;
    try {
      const { user: updated } = await api.deleteEducation(id);
      setFullUser(updated);
    } catch (err) {
      toast.error(err.message || "Could not remove this entry.");
    }
  }

  async function saveExperience(e) {
    e.preventDefault();
    try {
      const { id, ...entry } = expModal;
      const { user: updated } = id ? await api.updateExperience(id, entry) : await api.addExperience(entry);
      setFullUser(updated);
      setExpModal(null);
      toast.success("Experience saved.");
    } catch (err) {
      toast.error(err.message || "Could not save experience.");
    }
  }

  async function deleteExperience(id) {
    if (!window.confirm("Remove this experience entry?")) return;
    try {
      const { user: updated } = await api.deleteExperience(id);
      setFullUser(updated);
    } catch (err) {
      toast.error(err.message || "Could not remove this entry.");
    }
  }

  async function saveProject(e) {
    e.preventDefault();
    try {
      const { id, ...entry } = projectModal;
      const { user: updated } = id ? await api.updateProject(id, entry) : await api.addProject(entry);
      setFullUser(updated);
      setProjectModal(null);
      toast.success("Project saved.");
    } catch (err) {
      toast.error(err.message || "Could not save this project.");
    }
  }

  async function deleteProject(id) {
    if (!window.confirm("Remove this project?")) return;
    try {
      const { user: updated } = await api.deleteProject(id);
      setFullUser(updated);
    } catch (err) {
      toast.error(err.message || "Could not remove this project.");
    }
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">This is what recruiters see when you apply to a job.</p>
        </div>
      </div>

      <form onSubmit={saveBasicInfo} className="panel panel-padded">
        <div className="profile-photo-row">
          {form.profilePhoto ? (
            <img src={form.profilePhoto} alt={form.name} className="profile-photo-preview" />
          ) : (
            <div className="profile-photo-placeholder">
              <UserIcon size={22} />
            </div>
          )}
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Profile photo</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhotoFileChange}
              style={{ display: "none" }}
            />
            <div className="form-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn-secondary btn-sm" onClick={pickPhotoFile} disabled={photoUploading}>
                <Upload size={14} /> {photoUploading ? "Uploading..." : form.profilePhoto ? "Replace photo" : "Upload photo"}
              </button>
              {form.profilePhoto && (
                <button type="button" className="btn-danger btn-sm" onClick={removePhoto} disabled={photoUploading}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="p-name">
              Full name
            </label>
            <input id="p-name" type="text" className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user.email} disabled />
          </div>
        </div>

        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="p-phone">
              Phone
            </label>
            <div className="input-with-icon">
              <Phone size={16} />
              <input id="p-phone" type="tel" className="form-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="p-location">
              Location
            </label>
            <div className="input-with-icon">
              <MapPin size={16} />
              <input
                id="p-location"
                type="text"
                className="form-input"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="p-about">
            About
          </label>
          <textarea id="p-about" className="form-textarea" value={form.about} onChange={(e) => update("about", e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Skills</label>
          <div className="tag-input-box">
            {skills.map((skill) => (
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
              options={SKILL_OPTIONS.filter((skill) => !skills.some((s) => s.toLowerCase() === skill.toLowerCase()))}
              placeholder="Search a skill, then press Enter"
              onSelect={(value) => {
                const normalized = value.trim();
                if (!normalized) return;
                setSkills((prev) => (prev.some((s) => s.toLowerCase() === normalized.toLowerCase()) ? prev : [...prev, normalized]));
                setSkillInput("");
              }}
              onEnter={(value) => {
                const normalized = value.trim();
                if (!normalized) return;
                setSkills((prev) => (prev.some((s) => s.toLowerCase() === normalized.toLowerCase()) ? prev : [...prev, normalized]));
                setSkillInput("");
              }}
              className="skill-autocomplete-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="p-portfolio">
            Portfolio
          </label>
          <div className="input-with-icon">
            <LinkIcon size={16} />
            <input
              id="p-portfolio"
              type="url"
              className="form-input"
              placeholder="https://..."
              value={form.portfolio}
              onChange={(e) => update("portfolio", e.target.value)}
            />
          </div>
        </div>

        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="p-linkedin">
              LinkedIn
            </label>
            <div className="input-with-icon">
              <LinkedinIcon size={16} />
              <input id="p-linkedin" type="url" className="form-input" value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="p-github">
              GitHub
            </label>
            <div className="input-with-icon">
              <GithubIcon size={16} />
              <input id="p-github" type="url" className="form-input" value={form.github} onChange={(e) => update("github", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>

      <div className="panel panel-padded" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ marginBottom: 14 }}>
          <p className="card-title">
            <FileText size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Resume
          </p>
        </div>

        {user.resume ? (
          <div className="profile-entry-row">
            <div>
              <p className="dash-row-title">{user.resume.originalName}</p>
              <p className="dash-row-subtitle">Uploaded: {formatTimestampDate(user.resume.uploadedAt)}</p>
            </div>
            <div className="table-actions">
              <button type="button" className="btn-ghost btn-sm" onClick={viewResume} disabled={resumeBusy}>
                <Eye size={14} /> View
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={downloadResume} disabled={resumeBusy}>
                <Download size={14} /> Download
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={pickResumeFile} disabled={resumeBusy}>
                <RefreshCw size={14} /> {resumeUploading ? "Replacing..." : "Replace"}
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={deleteResumeFile} disabled={resumeBusy}>
                <Trash2 size={14} /> {resumeDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-entry-row">
            <div>
              <p className="dash-row-title">No resume uploaded yet</p>
              <p className="dash-row-subtitle">PDF only, up to 5 MB. You'll need this before applying to jobs.</p>
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={pickResumeFile} disabled={resumeUploading}>
              <Upload size={14} /> {resumeUploading ? "Uploading..." : "Upload resume"}
            </button>
          </div>
        )}

        <input ref={resumeInputRef} type="file" accept="application/pdf" hidden onChange={onResumeFileChange} />
      </div>

      <div className="panel panel-padded" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ marginBottom: 14 }}>
          <p className="card-title">
            <GraduationCap size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Education
          </p>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEduModal({ ...EMPTY_EDUCATION })}>
            <Plus size={14} /> Add
          </button>
        </div>
        {(user.education || []).length === 0 ? (
          <p className="table-cell-muted">No education added yet.</p>
        ) : (
          <div className="list-stack">
            {user.education.map((ed) => (
              <div key={ed._id || ed.id} className="profile-entry-row">
                <div>
                  <p className="dash-row-title">{ed.degree}</p>
                  <p className="dash-row-subtitle">
                    {ed.institution} {ed.startYear && `· ${ed.startYear}${ed.endYear ? ` - ${ed.endYear}` : ""}`}
                  </p>
                </div>
                <div className="table-actions">
                  <button
                    type="button"
                    className="btn-ghost btn-sm btn-icon"
                    onClick={() => setEduModal({ id: ed._id || ed.id, ...EMPTY_EDUCATION, ...ed })}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="btn-ghost btn-sm btn-icon" onClick={() => deleteEducation(ed._id || ed.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel panel-padded" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ marginBottom: 14 }}>
          <p className="card-title">
            <Briefcase size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Experience
          </p>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setExpModal({ ...EMPTY_EXPERIENCE })}>
            <Plus size={14} /> Add
          </button>
        </div>
        {(user.experience || []).length === 0 ? (
          <p className="table-cell-muted">No experience added yet.</p>
        ) : (
          <div className="list-stack">
            {user.experience.map((ex) => (
              <div key={ex._id || ex.id} className="profile-entry-row">
                <div>
                  <p className="dash-row-title">
                    {ex.title} · {ex.company}
                  </p>
                  <p className="dash-row-subtitle">
                    {ex.startDate} - {ex.current ? "Present" : ex.endDate || "—"}
                  </p>
                </div>
                <div className="table-actions">
                  <button
                    type="button"
                    className="btn-ghost btn-sm btn-icon"
                    onClick={() => setExpModal({ id: ex._id || ex.id, ...EMPTY_EXPERIENCE, ...ex })}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="btn-ghost btn-sm btn-icon" onClick={() => deleteExperience(ex._id || ex.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel panel-padded" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ marginBottom: 14 }}>
          <p className="card-title">
            <FileText size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Projects
          </p>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setProjectModal({ ...EMPTY_PROJECT })}>
            <Plus size={14} /> Add
          </button>
        </div>
        {(user.projects || []).length === 0 ? (
          <p className="table-cell-muted">No projects added yet.</p>
        ) : (
          <div className="list-stack">
            {user.projects.map((pr) => (
              <div key={pr._id || pr.id} className="profile-entry-row">
                <div>
                  <p className="dash-row-title">{pr.title}</p>
                  {pr.description && <p className="dash-row-subtitle">{pr.description}</p>}
                  {pr.link && (
                    <a href={pr.link} target="_blank" rel="noopener noreferrer" className="dash-row-subtitle">
                      {pr.link}
                    </a>
                  )}
                </div>
                <div className="table-actions">
                  <button
                    type="button"
                    className="btn-ghost btn-sm btn-icon"
                    onClick={() => setProjectModal({ id: pr._id || pr.id, ...EMPTY_PROJECT, ...pr })}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="btn-ghost btn-sm btn-icon" onClick={() => deleteProject(pr._id || pr.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {eduModal && (
        <Modal title={eduModal.id ? "Edit education" : "Add education"} onClose={() => setEduModal(null)}>
          <form onSubmit={saveEducation}>
            <div className="form-group">
              <label className="form-label">Degree</label>
              <input
                type="text"
                className="form-input"
                required
                value={eduModal.degree}
                onChange={(e) => setEduModal((p) => ({ ...p, degree: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Institution</label>
              <input
                type="text"
                className="form-input"
                required
                value={eduModal.institution}
                onChange={(e) => setEduModal((p) => ({ ...p, institution: e.target.value }))}
              />
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Start year</label>
                <input
                  type="number"
                  className="form-input"
                  value={eduModal.startYear}
                  onChange={(e) => setEduModal((p) => ({ ...p, startYear: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End year</label>
                <input
                  type="number"
                  className="form-input"
                  value={eduModal.endYear}
                  onChange={(e) => setEduModal((p) => ({ ...p, endYear: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEduModal(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {expModal && (
        <Modal title={expModal.id ? "Edit experience" : "Add experience"} onClose={() => setExpModal(null)}>
          <form onSubmit={saveExperience}>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Job title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={expModal.title}
                  onChange={(e) => setExpModal((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={expModal.company}
                  onChange={(e) => setExpModal((p) => ({ ...p, company: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Start (YYYY-MM)</label>
                <input
                  type="text"
                  placeholder="2023-01"
                  className="form-input"
                  value={expModal.startDate}
                  onChange={(e) => setExpModal((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End (YYYY-MM)</label>
                <input
                  type="text"
                  placeholder="2024-06"
                  className="form-input"
                  disabled={expModal.current}
                  value={expModal.endDate}
                  onChange={(e) => setExpModal((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <label className="form-checkbox-row">
              <input
                type="checkbox"
                checked={expModal.current}
                onChange={(e) => setExpModal((p) => ({ ...p, current: e.target.checked }))}
              />
              I currently work here
            </label>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={expModal.description}
                onChange={(e) => setExpModal((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setExpModal(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {projectModal && (
        <Modal title={projectModal.id ? "Edit project" : "Add project"} onClose={() => setProjectModal(null)}>
          <form onSubmit={saveProject}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="form-input"
                required
                value={projectModal.title}
                onChange={(e) => setProjectModal((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Link (optional)</label>
              <input
                type="url"
                placeholder="https://..."
                className="form-input"
                value={projectModal.link}
                onChange={(e) => setProjectModal((p) => ({ ...p, link: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={projectModal.description}
                onChange={(e) => setProjectModal((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setProjectModal(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Profile;
