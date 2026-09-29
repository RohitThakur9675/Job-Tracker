import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CheckCircle2, CalendarDays, Award, ArrowRight } from "lucide-react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatTime } from "../../utils/formatDate";
import StatCard from "../../components/StatCard";
import StatusPill from "../../components/StatusPill";
import JobCard from "../../components/JobCard";
import EmptyState from "../../components/EmptyState";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [latestJobs, setLatestJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.myApplications(), api.myInterviews(), api.listJobs({ sort: "latest" })])
      .then(([apps, ivs, jobsData]) => {
        setApplications(apps);
        setInterviews(ivs);
        setLatestJobs((jobsData.jobs || []).slice(0, 4));
      })
      .catch((err) => toast.error(err.message || "Could not load your dashboard."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading your dashboard...
        </div>
      </div>
    );
  }

  const total = applications.length;
  const active = applications.filter((a) => !["Selected", "Rejected"].includes(a.status)).length;
  const selected = applications.filter((a) => a.status === "Selected").length;
  const upcomingInterviews = interviews.filter((iv) => iv.interviewDate >= todayISO() && iv.status === "Scheduled");
  const recentApplications = applications.slice(0, 5);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name?.split(" ")[0]}</h1>
          <p className="page-subtitle">Here's what's happening with your job search.</p>
        </div>
      </div>

      <div className="stats-grid cols-4">
        <StatCard title="Total Applications" value={total} subtitle="All time" icon={Briefcase} badgeClass="badge-indigo" />
        <StatCard title="Active Applications" value={active} subtitle="In progress" icon={Award} badgeClass="badge-blue" />
        <StatCard title="Interviews" value={upcomingInterviews.length} subtitle="Upcoming" icon={CalendarDays} badgeClass="badge-amber" />
        <StatCard title="Offers" value={selected} subtitle="Selected" icon={CheckCircle2} badgeClass="badge-emerald" />
      </div>

      <div className="two-col-layout">
        <div className="panel panel-padded">
          <div className="card-header" style={{ marginBottom: 14 }}>
            <p className="card-title">Recent Applications</p>
            <Link to="/applications" className="card-link">
              View all
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <EmptyState icon={Briefcase} title="No applications yet" message="Browse jobs and apply to get started." />
          ) : (
            <div className="list-stack">
              {recentApplications.map((app) => (
                <div key={app.id} className="dash-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="dash-row-title">{app.job?.title}</p>
                    <p className="dash-row-subtitle">{app.job?.company?.name}</p>
                  </div>
                  <StatusPill status={app.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel panel-padded">
          <div className="card-header" style={{ marginBottom: 14 }}>
            <p className="card-title">Upcoming Interviews</p>
            <Link to="/interviews" className="card-link">
              View all
            </Link>
          </div>
          {upcomingInterviews.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No interviews scheduled" />
          ) : (
            <div className="list-stack">
              {upcomingInterviews.slice(0, 5).map((iv) => (
                <div key={iv.id} className="dash-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="dash-row-title">{iv.job?.title}</p>
                    <p className="dash-row-subtitle">
                      {formatDate(iv.interviewDate)} · {formatTime(iv.interviewTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-header" style={{ margin: "28px 0 14px" }}>
        <p className="card-title">Latest Jobs</p>
        <Link to="/jobs" className="card-link">
          Browse all <ArrowRight size={12} />
        </Link>
      </div>
      {latestJobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs posted yet" />
      ) : (
        <div className="card-grid cols-2">
          {latestJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
