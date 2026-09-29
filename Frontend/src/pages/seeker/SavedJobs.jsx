import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import JobCard from "../../components/JobCard";
import EmptyState from "../../components/EmptyState";

function SavedJobs() {
  const toast = useToast();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSavedJobs()
      .then(setSaved)
      .catch((err) => toast.error(err.message || "Could not load saved jobs."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unsave(job) {
    setSaved((prev) => prev.filter((s) => s.job?.id !== job.id));
    try {
      await api.unsaveJob(job.id);
    } catch (err) {
      toast.error(err.message || "Could not remove this job.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Saved Jobs</h1>
          <p className="page-subtitle">Jobs you've bookmarked to apply to later.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading saved jobs...
        </div>
      ) : saved.length === 0 ? (
        <EmptyState icon={Heart} title="No saved jobs yet" message="Tap the heart icon on any job to save it here." />
      ) : (
        <div className="list-stack">
          {saved
            .filter((s) => s.job)
            .map((s) => (
              <JobCard key={s.id} job={s.job} saved onToggleSave={unsave} />
            ))}
        </div>
      )}
    </div>
  );
}

export default SavedJobs;
