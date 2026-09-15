import "./Dashboard.css";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Companies({ activePage, onNavigate }) {
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
              <p className="page-eyebrow">COMPANIES</p>
              <h1 className="page-title">Companies</h1>
              <p className="page-subtitle">This page is coming soon.</p>
            </div>
          </section>

          <div className="panel panel-padded-lg">
            <p className="card-subtitle">
              A dedicated view of companies you're targeting will live here next.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Companies;
