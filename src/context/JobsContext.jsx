import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "jobtrack-applications";

const seedApplications = [
  { id: 1, company: "Google", role: "Software Engineer Intern", status: "Interview", appliedDate: "2026-09-08", logo: "G" },
  { id: 2, company: "Microsoft", role: "Frontend Developer", status: "Applied", appliedDate: "2026-09-06", logo: "M" },
  { id: 3, company: "Amazon", role: "Software Development Engineer", status: "Rejected", appliedDate: "2026-09-04", logo: "A" },
  { id: 4, company: "Razorpay", role: "Frontend Engineer", status: "Offer", appliedDate: "2026-09-02", logo: "R" },
];

const JobsContext = createContext(null);

export function JobsProvider({ children }) {
  const [applications, setApplications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : seedApplications;
    } catch {
      return seedApplications;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch {
      // storage full or unavailable — ignore, app still works in-memory
    }
  }, [applications]);

  function addApplication(app) {
    const newApp = {
      id: Date.now(),
      status: "Applied",
      appliedDate: new Date().toISOString().slice(0, 10),
      logo: (app.company?.[0] || "?").toUpperCase(),
      ...app,
    };
    setApplications((prev) => [newApp, ...prev]);
  }

  function updateApplication(id, updates) {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  function deleteApplication(id) {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  const value = { applications, addApplication, updateApplication, deleteApplication };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) {
    throw new Error("useJobs must be used inside a JobsProvider");
  }
  return ctx;
}
