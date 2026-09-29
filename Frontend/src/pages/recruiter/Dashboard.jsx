import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Users, CalendarDays, Award, Plus } from "lucide-react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import StatCard from "../../components/StatCard";
import StatusPill from "../../components/StatusPill";
import EmptyState from "../../components/EmptyState";

function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({ totalApplicants: 0, shortlisted: 0, selected: 0, recent: [] });
  const [interviewCount, setInterviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 3 requests total, regardless of how many jobs this recruiter has — the old version
    // fetched every job's full applicant list separately (N+1) just to compute a few counts.
    Promise.all([api.myJobs(), api.recruiterApplicationsSummary(), api.recruiterInterviews().catch(() => [])])
      .then(([jobsData, summaryData, interviews]) => {
        setJobs(jobsData);
        setSummary(summaryData);
        setInterviewCount(interviews.filter((iv) => iv.status === "Scheduled").length);
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

  const activeJobs = jobs.filter((j) => j.status === "Active").length;
  const { totalApplicants, shortlisted, selected, recent } = summary;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name?.split(" ")[0]}</h1>
          <p className="page-subtitle">Here's how your job postings are doing.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/recruiter/jobs/new" className="btn-primary">
            <Plus size={15} /> Post a Job
          </Link>
        </div>
      </div>

      <div className="stats-grid cols-4">
        <StatCard title="Total Jobs" value={jobs.length} subtitle={`${activeJobs} active`} icon={Briefcase} badgeClass="badge-indigo" />
        <StatCard title="Total Applicants" value={totalApplicants} subtitle="All jobs" icon={Users} badgeClass="badge-blue" />
        <StatCard title="Shortlisted" value={shortlisted} subtitle="In review" icon={Award} badgeClass="badge-amber" />
        <StatCard title="Interviews" value={interviewCount} subtitle="Scheduled" icon={CalendarDays} badgeClass="badge-emerald" />
      </div>

      <div className="panel panel-padded">
        <div className="card-header" style={{ marginBottom: 14 }}>
          <p className="card-title">Recent Applications</p>
          <Link to="/recruiter/jobs" className="card-link">
            View all jobs
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Users} title="No applications yet" message="Applications to your jobs will show up here." />
        ) : (
          <div className="list-stack">
            {recent.map((app) => (
              <div key={app.id} className="dash-row">
                <div style={{ minWidth: 0 }}>
                  <p className="dash-row-title">{app.applicant?.name}</p>
                  <p className="dash-row-subtitle">{app.jobTitle}</p>
                </div>
                <StatusPill status={app.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected > 0 && (
        <p className="table-cell-muted" style={{ marginTop: 16 }}>
          🎉 You've selected {selected} candidate{selected === 1 ? "" : "s"} so far.
        </p>
      )}
    </div>
  );
}

export default Dashboard;
