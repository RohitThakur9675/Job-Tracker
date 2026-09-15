import "./Dashboard.css";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Interviews({ activePage, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
              <p className="page-eyebrow">INTERVIEWS</p>
              <h1 className="page-title">Interviews</h1>
              <p className="page-subtitle">This page is coming soon.</p>
            </div>
          </section>

          <div className="panel panel-padded-lg">
            <p className="card-subtitle">
              Interview scheduling and tracking will live here next — for now, upcoming
              interviews still show on the Dashboard.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Interviews;
