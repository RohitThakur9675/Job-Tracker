import "./Dashboard.css";
import { useState } from "react";

import { Briefcase, Clock3, CalendarCheck, Trophy, Plus } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import ApplicationOverview from "../components/ApplicationOverview";
import UpcomingInterviews from "../components/UpcomingInterviews";
import RecentApplications from "../components/RecentApplications";
import QuickActions from "../components/QuickActions";
import AddApplicationModal from "../components/AddApplicationModal";
import { useJobs } from "../context/JobsContext";

function Dashboard({ activePage, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { applications } = useJobs();

  const activeCount = applications.filter(
    (a) => a.status === "Applied" || a.status === "Interview"
  ).length;
  const interviewCount = applications.filter((a) => a.status === "Interview").length;
  const offerCount = applications.filter((a) => a.status === "Offer").length;

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
              <p className="page-eyebrow">JOB SEARCH OVERVIEW</p>
              <h1 className="page-title">Good morning, Rohit 👋</h1>
              <p className="page-subtitle">
                Keep track of your applications and stay organized.
              </p>
            </div>

            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={17} />
              Add Application
            </button>
          </section>

          <section className="stat-grid">
            <StatCard title="Applications" value={applications.length} subtitle="Total tracked" icon={Briefcase} badgeClass="badge-indigo" />
            <StatCard title="Active" value={activeCount} subtitle="Currently in progress" icon={Clock3} badgeClass="badge-amber" />
            <StatCard title="Interviews" value={interviewCount} subtitle="Scheduled or done" icon={CalendarCheck} badgeClass="badge-purple" />
            <StatCard title="Offers" value={offerCount} subtitle="Received so far" icon={Trophy} badgeClass="badge-emerald" />
          </section>

          <section className="split-grid">
            <ApplicationOverview applications={applications} />
            <UpcomingInterviews />
          </section>

          <section className="split-grid">
            <RecentApplications applications={applications} onNavigate={onNavigate} />
            <QuickActions onNavigate={onNavigate} onAddClick={() => setShowAddModal(true)} />
          </section>

          <section className="metric-grid">
            <div className="panel panel-padded">
              <p className="metric-label">RESPONSE RATE</p>
              <h3 className="metric-value">34%</h3>
              <p className="metric-change is-positive">↑ 5.2% from last month</p>
            </div>

            <div className="panel panel-padded">
              <p className="metric-label">INTERVIEW RATE</p>
              <h3 className="metric-value">19%</h3>
              <p className="metric-change is-positive">↑ 3.1% from last month</p>
            </div>

            <div className="panel panel-padded">
              <p className="metric-label">TOP ROLE</p>
              <h3 className="metric-value is-small">Frontend Developer</h3>
              <p className="metric-change">14 applications</p>
            </div>
          </section>
        </main>
      </div>

      {showAddModal && (
        <AddApplicationModal mode="add" onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default Dashboard;
