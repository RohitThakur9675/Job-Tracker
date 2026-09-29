import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Users, Building2, Briefcase, FileText, Flag } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import StatCard from "../../components/StatCard";
import "./Dashboard.css";

function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .adminStats()
      .then(setStats)
      .catch((err) => toast.error(err.message || "Could not load admin stats."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !stats) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform-wide overview.</p>
        </div>
      </div>

      <div className="stats-grid cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} subtitle="Job seekers + recruiters" icon={Users} badgeClass="badge-indigo" />
        <StatCard title="Companies" value={stats.totalCompanies} subtitle="Registered" icon={Building2} badgeClass="badge-blue" />
        <StatCard title="Jobs" value={stats.totalJobs} subtitle="All statuses" icon={Briefcase} badgeClass="badge-cyan" />
        <StatCard title="Applications" value={stats.totalApplications} subtitle="All time" icon={FileText} badgeClass="badge-emerald" />
      </div>

      {stats.reportedJobs > 0 && (
        <Link to="/admin/reports" className="panel panel-padded admin-report-banner">
          <Flag size={18} />
          <span>
            <strong>{stats.reportedJobs}</strong> job{stats.reportedJobs === 1 ? "" : "s"} reported by users — review them now.
          </span>
        </Link>
      )}
    </div>
  );
}

export default Dashboard;
