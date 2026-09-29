import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import AutocompleteInput, { LOCATION_OPTIONS, JOB_TITLE_OPTIONS } from "../../components/AutocompleteInput";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import JobCard from "../../components/JobCard";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import "./Jobs.css";

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];

function Jobs() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    location: "",
    workMode: "",
    employmentType: "",
    experience: "",
    minSalary: "",
    sort: "latest",
  });
  // Kept separate from `filters` on purpose: typing updates `q` immediately (so the input
  // feels responsive) but the network request waits for `debouncedQ`, which only catches up
  // ~350ms after typing stops — otherwise every keystroke fired its own API call.
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ jobs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listJobs({ ...filters, q: debouncedQ, page });
      setResult(data);
    } catch (err) {
      toast.error(err.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedQ, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.role !== "jobseeker") return;
    api
      .listSavedJobs()
      .then((rows) => setSavedIds(new Set(rows.map((r) => r.job?.id).filter(Boolean))))
      .catch(() => {});
  }, [user]);

  function updateFilter(field, value) {
    setPage(1);
    if (field === "q") {
      setQ(value);
      return;
    }
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  async function toggleSave(job) {
    const isSaved = savedIds.has(job.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(job.id);
      else next.add(job.id);
      return next;
    });
    try {
      if (isSaved) await api.unsaveJob(job.id);
      else await api.saveJob(job.id);
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(job.id);
        else next.delete(job.id);
        return next;
      });
      toast.error(err.message || "Could not update saved jobs.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Find your next role</h1>
          <p className="page-subtitle">{loading ? "Searching..." : `${result.total} open position${result.total === 1 ? "" : "s"}`}</p>
        </div>
      </div>

      <div className="jobs-filter-panel panel panel-padded">
        <div className="filter-bar">
          <div className="filter-search">
            <Search size={16} />
            <AutocompleteInput
              value={q}
              onChange={(value) => updateFilter("q", value)}
              options={JOB_TITLE_OPTIONS}
              placeholder="Job title, company, skill, or keyword"
            />
          </div>
          <div className="filter-search">
            <MapPin size={16} />
            <AutocompleteInput
              value={filters.location}
              onChange={(value) => updateFilter("location", value)}
              options={LOCATION_OPTIONS}
              placeholder="City, state or remote"
            />
          </div>
        </div>

        <div className="filter-bar">
          <select className="form-select" value={filters.workMode} onChange={(e) => updateFilter("workMode", e.target.value)}>
            <option value="">Any work mode</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.employmentType}
            onChange={(e) => updateFilter("employmentType", e.target.value)}
          >
            <option value="">Any employment type</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className="form-select" value={filters.experience} onChange={(e) => updateFilter("experience", e.target.value)}>
            <option value="">Any experience</option>
            <option value="0">Fresher / 0 years</option>
            <option value="1">1 year</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
            <option value="5">5+ years</option>
          </select>
          <input
            type="number"
            min="0"
            className="form-input"
            style={{ maxWidth: 160 }}
            placeholder="Min salary (₹)"
            value={filters.minSalary}
            onChange={(e) => updateFilter("minSalary", e.target.value)}
          />
          <select className="form-select" value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
            <option value="latest">Latest</option>
            <option value="relevant">Most relevant</option>
            <option value="salary">Highest salary</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading jobs...
        </div>
      ) : result.jobs.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No jobs match those filters"
          message="Try widening your search — remove a filter or use a broader keyword."
        />
      ) : (
        <>
          <div className="list-stack">
            {result.jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={savedIds.has(job.id)}
                onToggleSave={user?.role === "jobseeker" ? toggleSave : undefined}
              />
            ))}
          </div>
          <Pagination page={result.page || page} totalPages={result.pages || 1} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default Jobs;
