// All communication with the Express backend lives here.
//
// In development Vite proxies "/api" to http://localhost:5000 (see vite.config.js).
// For a deployed frontend set VITE_API_URL, e.g. https://jobtrack-api.onrender.com/api
const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
// Socket.IO connects to the server's origin, not the "/api" REST prefix — the
// signaling server (backend/src/realtime/signaling.js) is mounted at "/socket.io"
// on the same HTTP server. "" (same-origin) works in dev because vite.config.js
// proxies /socket.io to the backend, same as it does for /api.
export const SOCKET_URL = BASE_URL.replace(/\/api\/?$/, "");

export const TOKEN_STORAGE_KEY = "jobtrack-token";
// Fired when the server says our token is no longer valid (expired / account removed).
export const AUTH_EXPIRED_EVENT = "jobtrack-auth-expired";

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // storage unavailable — the user will simply have to log in again next time
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status; // 0 = the server could not be reached at all
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  // For FormData (file uploads) the browser sets Content-Type itself, multipart
  // boundary included — setting it manually here would break the upload.
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Please make sure the backend is running.", 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    const fallback =
      response.status >= 500
        ? "The server isn't responding. Please make sure the backend is running."
        : `Request failed (${response.status}).`;
    throw new ApiError(data?.message || fallback, response.status);
  }

  return data;
}

// Like request(), but for endpoints that stream a file back (resume view/download)
// instead of returning JSON. A plain <a href> can't carry the Authorization header,
// so these go through fetch and hand back a Blob + the filename the server sent.
async function requestBlob(path) {
  const token = tokenStore.get();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError("Can't reach the server. Please make sure the backend is running.", 0);
  }

  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.message || `Request failed (${response.status}).`, response.status);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match ? match[1] : "resume.pdf";
  const blob = await response.blob();
  return { blob, filename };
}

// Opens a fetched file in a new tab (used for "View Resume").
export function openBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Triggers a "Save As" download for a fetched file (used for "Download").
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "resume.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Turns a plain object of query params into "?a=1&b=2", skipping empty values.
function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export const api = {
  // --- auth (no token needed) ---
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  // --- current user profile ---
  updateMe: (updates) => request("/users/me", { method: "PATCH", body: updates }),
  getPublicProfile: (id) => request(`/users/${id}/profile`),
  addEducation: (entry) => request("/users/me/education", { method: "POST", body: entry }),
  updateEducation: (id, entry) => request(`/users/me/education/${id}`, { method: "PATCH", body: entry }),
  deleteEducation: (id) => request(`/users/me/education/${id}`, { method: "DELETE" }),
  addExperience: (entry) => request("/users/me/experience", { method: "POST", body: entry }),
  updateExperience: (id, entry) => request(`/users/me/experience/${id}`, { method: "PATCH", body: entry }),
  deleteExperience: (id) => request(`/users/me/experience/${id}`, { method: "DELETE" }),

  addProject: (entry) => request("/users/me/projects", { method: "POST", body: entry }),
  updateProject: (id, entry) => request(`/users/me/projects/${id}`, { method: "PATCH", body: entry }),
  deleteProject: (id) => request(`/users/me/projects/${id}`, { method: "DELETE" }),

  // --- profile photo (own account, any role) ---
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append("photo", file);
    return request("/users/me/photo", { method: "POST", body: form });
  },
  deletePhoto: () => request("/users/me/photo", { method: "DELETE" }),

  // --- resume (own profile) ---
  uploadResume: (file) => {
    const form = new FormData();
    form.append("resume", file);
    return request("/users/me/resume", { method: "POST", body: form });
  },
  deleteResume: () => request("/users/me/resume", { method: "DELETE" }),
  viewResume: () => requestBlob("/users/me/resume/view"),
  downloadResume: () => requestBlob("/users/me/resume/download"),

  // --- companies ---
  listCompanies: (params) => request(`/companies${qs(params)}`, { auth: false }),
  getCompany: (id) => request(`/companies/${id}`, { auth: false }),
  getMyCompany: () => request("/companies/me"),
  saveMyCompany: (payload) => request("/companies/me", { method: "PUT", body: payload }),

  // --- jobs ---
  listJobs: (params) => request(`/jobs${qs(params)}`, { auth: false }),
  getJob: (id) => request(`/jobs/${id}`, { auth: false }),
  createJob: (payload) => request("/jobs", { method: "POST", body: payload }),
  updateJob: (id, payload) => request(`/jobs/${id}`, { method: "PATCH", body: payload }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),
  myJobs: () => request("/jobs/mine"),
  reportJob: (id) => request(`/jobs/${id}/report`, { method: "POST" }),

  // --- applications ---
  applyToJob: (payload) => request("/applications", { method: "POST", body: payload }),
  myApplications: () => request("/applications/mine"),
  getApplication: (id) => request(`/applications/${id}`),
  jobApplicants: (jobId) => request(`/applications/job/${jobId}`),
  recruiterApplicationsSummary: () => request("/applications/recruiter/summary"),
  updateApplicationStatus: (id, status) =>
    request(`/applications/${id}/status`, { method: "PATCH", body: { status } }),
  withdrawApplication: (id) => request(`/applications/${id}`, { method: "DELETE" }),
  viewApplicationResume: (id) => requestBlob(`/applications/${id}/resume/view`),
  downloadApplicationResume: (id) => requestBlob(`/applications/${id}/resume/download`),

  // --- interviews ---
  scheduleInterview: (payload) => request("/interviews", { method: "POST", body: payload }),
  myInterviews: () => request("/interviews/mine"),
  recruiterInterviews: () => request("/interviews/recruiter/mine"),
  updateInterview: (id, payload) => request(`/interviews/${id}`, { method: "PATCH", body: payload }),
  getMeetingInfo: (meetingId) => request(`/interviews/meeting/${meetingId}`),

  // --- notifications ---
  listNotifications: () => request("/notifications"),
  unreadNotificationCount: () => request("/notifications/unread-count"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PATCH" }),

  // --- saved jobs ---
  listSavedJobs: () => request("/saved-jobs"),
  saveJob: (jobId) => request("/saved-jobs", { method: "POST", body: { jobId } }),
  unsaveJob: (jobId) => request(`/saved-jobs/${jobId}`, { method: "DELETE" }),

  // --- admin ---
  adminStats: () => request("/admin/stats"),
  adminListUsers: (params) => request(`/admin/users${qs(params)}`),
  adminSetUserActive: (id, isActive) => request(`/admin/users/${id}/active`, { method: "PATCH", body: { isActive } }),
  adminListCompanies: () => request("/admin/companies"),
  adminVerifyCompany: (id, isVerified) =>
    request(`/admin/companies/${id}/verify`, { method: "PATCH", body: { isVerified } }),
  adminListJobs: () => request("/admin/jobs"),
  adminCreateJob: (payload) => request("/admin/jobs", { method: "POST", body: payload }),
  adminListApplications: () => request("/admin/applications"),
  adminReportedJobs: () => request("/admin/reported-jobs"),
  adminDismissReport: (id) => request(`/admin/reported-jobs/${id}/dismiss`, { method: "PATCH" }),
};
