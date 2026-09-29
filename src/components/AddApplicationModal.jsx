import "./AddApplicationModal.css";
import { useState } from "react";
import { X } from "lucide-react";
import { useJobs } from "../context/JobsContext";

const statusOptions = ["Applied", "Interview", "Offer", "Rejected"];

function AddApplicationModal({ mode = "add", application, onClose }) {
  const { addApplication, updateApplication } = useJobs();
  const [company, setCompany] = useState(application?.company || "");
  const [role, setRole] = useState(application?.role || "");
  const [status, setStatus] = useState(application?.status || "Applied");
  const [appliedDate, setAppliedDate] = useState(
    application?.appliedDate || new Date().toISOString().slice(0, 10)
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    if (mode === "edit" && application) {
      updateApplication(application.id, {
        company: company.trim(),
        role: role.trim(),
        status,
        appliedDate,
      });
    } else {
      addApplication({
        company: company.trim(),
        role: role.trim(),
        status,
        appliedDate,
      });
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === "edit" ? "Edit Application" : "Add New Application"}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="form-label">
            Company Name
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Google"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </label>

          <label className="form-label">
            Job Role
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Software Engineer Intern"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </label>

          <div className="form-row">
            <label className="form-label">
              Status
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="form-label">
              Applied Date
              <input
                type="date"
                className="form-input"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {mode === "edit" ? "Save Changes" : "Add Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddApplicationModal;
