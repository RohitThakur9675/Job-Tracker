import "./Dashboard.css";
import "./Applications.css";
import "../components/RecentApplications.css";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import AddApplicationModal from "../components/AddApplicationModal";
import { useJobs } from "../context/JobsContext";
import { formatDate } from "../utils/formatDate";

const statusClass = {
  Applied: "status-applied",
  Interview: "status-interview",
  Rejected: "status-rejected",
  Offer: "status-offer",
};

const tabs = ["All", "Applied", "Interview", "Offer", "Rejected"];

function Applications({ activePage, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { applications, deleteApplication } = useJobs();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState(null);

  const filtered = applications.filter((a) => {
    const matchesTab = activeTab === "All" || a.status === activeTab;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  function handleDelete(id) {
    if (window.confirm("Delete this application?")) {
      deleteApplication(id);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={onNavigate}
      />

      <div className="dashboard-content">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="dashboard-main">
          <section className="page-header">
            <div>
              <p className="page-eyebrow">ALL APPLICATIONS</p>
              <h1 className="page-title">Applications</h1>
              <p className="page-subtitle">
                Manage and track all your job applications in one place.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setModalState({ mode: "add" })}>
              <Plus size={17} />
              Add Application
            </button>
          </section>

          <div className="panel apps-panel">
            <div className="apps-toolbar">
              <div className="apps-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={`apps-tab ${activeTab === tab ? "is-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    <span className="apps-tab-count">
                      {tab === "All"
                        ? applications.length
                        : applications.filter((a) => a.status === tab).length}
                    </span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="apps-search"
                placeholder="Search company or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="apps-empty">
                        No applications match this filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="company-cell">
                          <div className="company-logo">{item.logo}</div>
                          <span className="company-name">{item.company}</span>
                        </div>
                      </td>
                      <td>{item.role}</td>
                      <td>
                        <span className={`status-pill ${statusClass[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(item.appliedDate)}</td>
                      <td>
                        <div className="apps-row-actions">
                          <button
                            className="apps-icon-btn"
                            onClick={() => setModalState({ mode: "edit", application: item })}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="apps-icon-btn is-danger"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {modalState && (
        <AddApplicationModal
          mode={modalState.mode}
          application={modalState.application}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export default Applications;
