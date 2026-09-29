import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, FileText, MapPin, CalendarDays, Eye, Download, Phone, Link2 } from "lucide-react";
import { api, openBlob, downloadBlob } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import "./Applicants.css";

const TABS = ["All", "Applied", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];
const INTERVIEW_TYPES = ["Video", "Phone", "In-person"];

function Applicants() {
  const { id: jobId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    interviewDate: "",
    interviewTime: "",
    interviewType: "Video",
    notes: "",
  });

  function load() {
    setLoading(true);
    Promise.all([api.getJob(jobId), api.jobApplicants(jobId)])
      .then(([jobData, apps]) => {
        setJob(jobData);
        setApplicants(apps);
      })
      .catch((err) => toast.error(err.message || "Could not load applicants."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () => (tab === "All" ? applicants : applicants.filter((a) => a.status === tab)),
    [applicants, tab]
  );

  async function viewResume(applicationId) {
    try {
      const { blob } = await api.viewApplicationResume(applicationId);
      openBlob(blob);
    } catch (err) {
      toast.error(err.message || "Could not open this resume.");
    }
  }

  async function downloadResume(applicationId) {
    try {
      const { blob, filename } = await api.downloadApplicationResume(applicationId);
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || "Could not download this resume.");
    }
  }

  async function setStatus(application, status) {
    if ((status === "Rejected" || status === "Selected") && !window.confirm(`Are you sure you want to mark ${application.applicant?.name || "this candidate"} as ${status}?`)) {
      return;
    }
    try {
      const updated = await api.updateApplicationStatus(application.id, status);
      setApplicants((prev) => prev.map((a) => (a.id === updated.id ? { ...a, status: updated.status } : a)));
      setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, status: updated.status } : prev));
      toast.success(`Marked as ${status}.`);
    } catch (err) {
      toast.error(err.message || "Could not update status.");
    }
  }

  async function submitInterview(e) {
    e.preventDefault();
    setScheduling(true);
    try {
      await api.scheduleInterview({ applicationId: selected.id, ...interviewForm });
      toast.success("Interview scheduled.");
      setSelected(null);
      setInterviewForm({ interviewDate: "", interviewTime: "", interviewType: "Video", notes: "" });
      load();
    } catch (err) {
      toast.error(err.message || "Could not schedule the interview.");
    } finally {
      setScheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading applicants...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/recruiter/jobs" className="btn-ghost btn-sm" style={{ marginBottom: 16, display: "inline-flex" }}>
        <ArrowLeft size={15} /> My Jobs
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Applicants for {job?.title}</h1>
          <p className="page-subtitle">{applicants.length} total applicant{applicants.length === 1 ? "" : "s"} · Use the actions to shortlist, interview, select or reject.</p>
        </div>
      </div>

      <div className="apps-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`apps-tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No applicants here" message="Check back later, or view a different status tab." />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Skills</th>
                <th>Applied</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const applicant = app.applicant || {};
                const initials = (applicant.name || "?").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
                return (
                  <tr key={app.id} className="app-table-row-clickable" onClick={() => setSelected(app)}>
                    <td>
                      <div className="table-person">
                        <button
                          type="button"
                          className="table-avatar table-avatar-button"
                          title="Open candidate profile"
                          onClick={(e) => { e.stopPropagation(); navigate(`/candidate/${applicant.id}?application=${app.id}`); }}
                        >
                          {applicant.profilePhoto ? <img src={applicant.profilePhoto} alt={applicant.name} /> : initials}
                        </button>
                        <div>
                          <button
                            type="button"
                            className="profile-name-link"
                            onClick={(e) => { e.stopPropagation(); navigate(`/candidate/${applicant.id}?application=${app.id}`); }}
                          >
                            {applicant.name}
                          </button>
                          <p className="dash-row-subtitle">{applicant.location || applicant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell-muted">{(applicant.skills || []).slice(0, 3).join(", ") || "—"}</td>
                    <td className="table-cell-muted">{formatDate(app.appliedDate)}</td>
                    <td>
                      <StatusPill status={app.status} />
                    </td>
                    <td>
                      <div className="table-actions applicant-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={app.status !== "Applied"}
                          onClick={() => setStatus(app, "Shortlisted")}
                          title={app.status === "Applied" ? "Shortlist candidate" : "Shortlist is available only for Applied candidates"}
                        >
                          Shortlist
                        </button>
                        {!['Selected', 'Rejected'].includes(app.status) && (
                          <button type="button" className="btn-ghost btn-sm" onClick={() => setSelected(app)}>
                            Interview
                          </button>
                        )}
                        {!['Selected', 'Rejected'].includes(app.status) && (
                          <button type="button" className="btn-primary btn-sm" onClick={() => setStatus(app, "Selected")}>
                            Select
                          </button>
                        )}
                        {!['Selected', 'Rejected'].includes(app.status) && (
                          <button type="button" className="btn-danger btn-sm" onClick={() => setStatus(app, "Rejected")}>
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={selected.applicant?.name || "Applicant"} onClose={() => setSelected(null)} wide>
          <div className="applicant-detail-grid">
            <div>
              <div className="apps-detail-meta">
                <p>
                  <strong>Email:</strong> {selected.applicant?.email}
                </p>
                {selected.applicant?.location && (
                  <p>
                    <MapPin size={13} /> {selected.applicant.location}
                  </p>
                )}
                {selected.applicant?.phone && (
                  <p><Phone size={13} /> {selected.applicant.phone}</p>
                )}
                {selected.applicant?.about && (
                  <p><strong>About:</strong> {selected.applicant.about}</p>
                )}
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {selected.applicant?.linkedin && <a className="btn-ghost btn-sm" href={selected.applicant.linkedin} target="_blank" rel="noreferrer"><Link2 size={13} /> LinkedIn</a>}
                  {selected.applicant?.github && <a className="btn-ghost btn-sm" href={selected.applicant.github} target="_blank" rel="noreferrer"><Link2 size={13} /> GitHub</a>}
                  {selected.applicant?.portfolio && <a className="btn-ghost btn-sm" href={selected.applicant.portfolio} target="_blank" rel="noreferrer"><Link2 size={13} /> Portfolio</a>}
                </div>
                {selected.resumeSnapshot ? (
                  <p>
                    <FileText size={13} /> {selected.resumeSnapshot.originalName}
                    <br />
                    <button type="button" className="btn-ghost btn-sm" onClick={() => viewResume(selected.id)}>
                      <Eye size={13} /> View Resume
                    </button>{" "}
                    <button type="button" className="btn-ghost btn-sm" onClick={() => downloadResume(selected.id)}>
                      <Download size={13} /> Download
                    </button>
                  </p>
                ) : (
                  <p className="table-cell-muted">No resume was attached to this application.</p>
                )}
                {selected.coverNote && (
                  <>
                    <p className="form-label" style={{ marginTop: 14 }}>
                      Cover note
                    </p>
                    <p>{selected.coverNote}</p>
                  </>
                )}
              </div>
              {selected.applicant?.skills?.length > 0 && (
                <>
                  <p className="form-label" style={{ marginTop: 14 }}>
                    Skills
                  </p>
                  <div className="chip-row">
                    {selected.applicant.skills.map((s) => (
                      <span key={s} className="skill-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {selected.applicant?.projects?.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <p className="form-label">Projects</p>
                  <div className="list-stack">
                    {selected.applicant.projects.map((project) => (
                      <div key={project._id || project.title} className="dash-row">
                        <div>
                          <p className="dash-row-title">{project.title}</p>
                          {project.description && <p className="dash-row-subtitle">{project.description}</p>}
                          {project.link && <a href={project.link} target="_blank" rel="noreferrer" className="dash-row-subtitle">{project.link}</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.applicant?.education?.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <p className="form-label">Education</p>
                  <div className="list-stack">
                    {selected.applicant.education.map((item) => (
                      <div key={item._id || `${item.degree}-${item.institution}`} className="dash-row">
                        <div>
                          <p className="dash-row-title">{item.degree}</p>
                          <p className="dash-row-subtitle">{item.institution}{item.startYear ? ` · ${item.startYear}-${item.endYear || "Present"}` : ""}</p>
                          {item.description && <p className="table-cell-muted">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.applicant?.experience?.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <p className="form-label">Experience</p>
                  <div className="list-stack">
                    {selected.applicant.experience.map((item) => (
                      <div key={item._id || `${item.title}-${item.company}`} className="dash-row">
                        <div>
                          <p className="dash-row-title">{item.title}</p>
                          <p className="dash-row-subtitle">{item.company}{item.startDate ? ` · ${item.startDate}-${item.current ? "Present" : item.endDate || ""}` : ""}</p>
                          {item.description && <p className="table-cell-muted">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: 18 }}>
                <StatusPill status={selected.status} />
                {!["Selected", "Rejected"].includes(selected.status) && (
                  <>
                    {selected.status === "Applied" && (
                      <button type="button" className="btn-secondary btn-sm" onClick={() => setStatus(selected, "Shortlisted")}>
                        Shortlist
                      </button>
                    )}
                    <button type="button" className="btn-primary btn-sm" onClick={() => setStatus(selected, "Selected")}>
                      Select candidate
                    </button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => setStatus(selected, "Rejected")}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>

            {!["Selected", "Rejected"].includes(selected.status) && (
              <div className="applicant-schedule-panel">
                <p className="form-label" style={{ marginBottom: 10 }}>
                  <CalendarDays size={13} style={{ verticalAlign: -2 }} /> Schedule an interview
                </p>
                <form onSubmit={submitInterview}>
                  <div className="form-row cols-2">
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={interviewForm.interviewDate}
                        onChange={(e) => setInterviewForm((p) => ({ ...p, interviewDate: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Time</label>
                      <input
                        type="time"
                        required
                        className="form-input"
                        value={interviewForm.interviewTime}
                        onChange={(e) => setInterviewForm((p) => ({ ...p, interviewTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interview type</label>
                    <select
                      className="form-select"
                      value={interviewForm.interviewType}
                      onChange={(e) => setInterviewForm((p) => ({ ...p, interviewType: e.target.value }))}
                    >
                      {INTERVIEW_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  {interviewForm.interviewType === "Video" ? (
                    <p className="table-cell-muted" style={{ marginBottom: 4 }}>
                      A secure in-app video meeting room will be created automatically when you schedule this interview.
                    </p>
                  ) : null}
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder={
                        interviewForm.interviewType === "Phone"
                          ? "Phone number to call, timezone, anything the candidate should know..."
                          : interviewForm.interviewType === "In-person"
                            ? "Interview address, floor/room, what to bring..."
                            : "Anything the candidate should know before the interview..."
                      }
                      value={interviewForm.notes}
                      onChange={(e) => setInterviewForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn-primary btn-block" disabled={scheduling}>
                    {scheduling ? "Scheduling..." : "Schedule interview"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Applicants;
