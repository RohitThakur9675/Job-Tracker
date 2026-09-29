import { useEffect, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Download, Eye, FileText, GraduationCap, Link2, MapPin, Phone, Briefcase } from "lucide-react";
import { api, downloadBlob, openBlob } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatTimestampDate } from "../../utils/formatDate";
import "./CandidateProfile.css";

function CandidateProfile() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get("application");
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumeBusy, setResumeBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getPublicProfile(id),
      applicationId ? api.getApplication(applicationId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([profileData, applicationData]) => {
        setProfile(profileData);
        setApplication(applicationData);
      })
      .catch((err) => toast.error(err.message || "Could not load this profile."))
      .finally(() => setLoading(false));
  }, [id]);

  async function viewResume() {
    if (!applicationId) return toast.error("Open this profile from an application to view its resume.");
    setResumeBusy(true);
    try {
      const { blob } = await api.viewApplicationResume(applicationId);
      openBlob(blob);
    } catch (err) {
      toast.error(err.message || "Could not open the resume.");
    } finally { setResumeBusy(false); }
  }

  async function downloadResume() {
    if (!applicationId) return toast.error("Open this profile from an application to download its resume.");
    setResumeBusy(true);
    try {
      const { blob, filename } = await api.downloadApplicationResume(applicationId);
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || "Could not download the resume.");
    } finally { setResumeBusy(false); }
  }

  if (loading) return <div className="page"><div className="loading-block"><span className="loading-spinner-sm" /> Loading profile...</div></div>;
  if (!profile) return <div className="page page-narrow"><Link to="/recruiter/jobs" className="btn-ghost btn-sm"><ArrowLeft size={15} /> Back</Link></div>;

  const initials = profile.name?.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";

  return (
    <div className="page page-narrow candidate-profile-page">
      <button type="button" className="btn-ghost btn-sm" onClick={() => window.history.back()}><ArrowLeft size={15} /> Back</button>

      <section className="candidate-hero panel panel-padded">
        <div className="candidate-avatar-large">
          {profile.profilePhoto ? <img src={profile.profilePhoto} alt={profile.name} /> : initials}
        </div>
        <div className="candidate-hero-main">
          <h1 className="page-title">{profile.name}</h1>
          {profile.location && <p className="candidate-meta"><MapPin size={15} /> {profile.location}</p>}
          {profile.phone && <p className="candidate-meta"><Phone size={15} /> {profile.phone}</p>}
          {profile.email && <p className="candidate-meta">{profile.email}</p>}
          {profile.about && <p className="candidate-about">{profile.about}</p>}
          {application && (
            <div className="candidate-application-context">
              <strong>Applied for:</strong> {application.job?.title || "Job"}
              <span className={`candidate-status status-${String(application.status || "Applied").toLowerCase().replaceAll(" ", "-")}`}>{application.status}</span>
            </div>
          )}
          <div className="candidate-links">
            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer"><Link2 size={14} /> LinkedIn</a>}
            {profile.github && <a href={profile.github} target="_blank" rel="noreferrer"><Link2 size={14} /> GitHub</a>}
            {profile.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer"><Briefcase size={14} /> Portfolio</a>}
          </div>
        </div>
      </section>

      <section className="panel panel-padded candidate-section">
        <h2 className="section-title">Skills</h2>
        {profile.skills?.length ? <div className="candidate-skills">{profile.skills.map((s) => <span key={s}>{s}</span>)}</div> : <p className="table-cell-muted">No skills added yet.</p>}
      </section>

      <section className="panel panel-padded candidate-section">
        <h2 className="section-title"><GraduationCap size={18} /> Education</h2>
        {profile.education?.length ? <div className="candidate-list">{profile.education.map((e) => <div className="candidate-list-item" key={e._id || `${e.degree}-${e.institution}`}><strong>{e.degree}</strong><span>{e.institution}{e.startYear ? ` · ${e.startYear}-${e.endYear || "Present"}` : ""}</span>{e.description && <p>{e.description}</p>}</div>)}</div> : <p className="table-cell-muted">No education added yet.</p>}
      </section>

      <section className="panel panel-padded candidate-section">
        <h2 className="section-title"><Briefcase size={18} /> Experience</h2>
        {profile.experience?.length ? <div className="candidate-list">{profile.experience.map((e) => <div className="candidate-list-item" key={e._id || `${e.title}-${e.company}`}><strong>{e.title}</strong><span>{e.company}{e.startDate ? ` · ${e.startDate}-${e.current ? "Present" : e.endDate || ""}` : ""}</span>{e.description && <p>{e.description}</p>}</div>)}</div> : <p className="table-cell-muted">No experience added yet.</p>}
      </section>

      <section className="panel panel-padded candidate-section">
        <h2 className="section-title"><FileText size={18} /> Projects</h2>
        {profile.projects?.length ? (
          <div className="candidate-list">
            {profile.projects.map((project) => (
              <div className="candidate-list-item" key={project._id || project.title}>
                <strong>{project.title}</strong>
                {project.description && <p>{project.description}</p>}
                {project.link && (
                  <a href={project.link} target="_blank" rel="noreferrer">{project.link}</a>
                )}
              </div>
            ))}
          </div>
        ) : <p className="table-cell-muted">No projects added yet.</p>}
      </section>

      <section className="panel panel-padded candidate-section">
        <h2 className="section-title"><FileText size={18} /> Resume</h2>
        {profile.resume ? (
          <div className="resume-profile-row">
            <div><strong>{profile.resume.originalName}</strong><span>Uploaded {formatTimestampDate(profile.resume.uploadedAt)}</span></div>
            <div className="table-actions">
              <button type="button" className="btn-ghost btn-sm" disabled={resumeBusy || !applicationId} onClick={viewResume}><Eye size={14} /> View</button>
              <button type="button" className="btn-primary btn-sm" disabled={resumeBusy || !applicationId} onClick={downloadResume}><Download size={14} /> Download</button>
            </div>
          </div>
        ) : <p className="table-cell-muted">No resume uploaded.</p>}
        {!applicationId && profile.resume && <p className="table-cell-muted" style={{ marginTop: 8 }}>Open this profile from an application to access the submitted resume securely.</p>}
      </section>
    </div>
  );
}

export default CandidateProfile;
