# JobTrack — React + Express + MongoDB

The JobTrack frontend now talks to a real backend:

```
React (Vite)  →  Express API  →  MongoDB
   fetch()        JWT auth        users + applications (+ interviews, tasks, activity)
```

```
Job-Tracker/
├── backend/    Node.js + Express + MongoDB (Mongoose) API   (its own package.json)
└── frontend/   React + Vite app                             (its own package.json)
```

Each folder is a separate npm project, so each one needs its own `npm install` and its own terminal.

## Run it locally

### 1. MongoDB

Pick one:

- **Local:** install MongoDB Community Edition and start it. It listens on `mongodb://127.0.0.1:27017`.
- **Atlas (cloud, free tier):** create a cluster, add a database user, allow your IP, and copy the
  connection string (`mongodb+srv://...`).

### 2. Backend

```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
```

Open `.env` and set at least:

- `MONGODB_URI` — local or Atlas connection string (the database name at the end, e.g. `/jobtrack`, is created automatically)
- `JWT_SECRET` — a long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

```bash
npm install
npm run dev                 # http://localhost:5000
```

Check it: open <http://localhost:5000/api/health> → `{"status":"ok","database":"connected"}`.

### 3. Frontend

Open a **second terminal** (keep the backend running in the first one):

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

In development Vite forwards every `/api/...` request to `http://localhost:5000`
(see `vite.config.js`), so there are no CORS settings to worry about. If your backend uses another
port, change it there.

> **Status:** both the backend and frontend are now the full multi-role JobTrack
> portal. See "Frontend" below for the page list, and `PHASE_PROGRESS.md` for how
> it was built and what's still worth adding.


## Demo company/job catalog (50 companies)

If you want the local app to immediately look populated, the backend includes a **demo-only** seed command. It adds 50 real company names/domains and one clearly labelled sample listing per company. The sample vacancies are not claimed to be live openings from those companies.

```bash
cd backend
npm install
npm run seed:demo
```

Optional demo-admin settings:

```text
DEMO_ADMIN_EMAIL=your-demo-admin@example.com
DEMO_ADMIN_PASSWORD=choose-a-password
```

Set those before running the seed if you want a custom local admin account. Do not use the demo defaults on a public deployment.

The UI also has a logo fallback: if a company logo URL is missing or broken, JobTrack tries the company's website favicon and then falls back to initials, so a blank company-logo box is avoided.

## How it works

**Roles.** Every account is exactly one of `jobseeker`, `recruiter`, or `admin` (`User.role`).
`admin` accounts are never created through the API — seed one directly in MongoDB when you need it.
A signed JWT carries both the user's id (as its subject) and role, so `requireRole("recruiter", "admin")`
on a route can authorize a request without an extra database lookup.

**Ownership.** A recruiter can only edit/delete a `Job` where `job.postedBy` is their own id, and can
only see applicants for jobs they posted — every mutating controller checks this explicitly (admins
bypass the check). A job seeker can only see their own applications and interviews.

**Jobs, Companies, Applications, Interviews, Notifications, SavedJobs** are separate collections
(`backend/src/models/`) linked by ObjectId references, not one big document — see the comments in each
model file for why each field and index exists (duplicate-application prevention, why a scheduled video
interview can't save without a meeting link, why a `Company` can have no `recruiter`, etc.).

**Notifications** are raised centrally through `utils/notify.js` — every place that changes an
application's status or schedules/updates an interview calls it, so the "who gets notified when"
logic (Section 13 of the spec) lives in one place instead of being duplicated per controller.

## API reference

All routes except `/auth/signup`, `/auth/login`, `/health`, and the public `GET` job/company
browsing routes need `Authorization: Bearer <token>`.

**Auth** (`/api/auth`)
| Method | Route | Notes |
| --- | --- | --- |
| POST | `/signup` | `{ name, email, password, role }` — role is `jobseeker` or `recruiter` |
| POST | `/login` | `{ email, password }` → `{ token, user }` |
| GET | `/me` | current user |

**Profile** (`/api/users`) — all require auth
| Method | Route | Notes |
| --- | --- | --- |
| PATCH | `/me` | update profile fields (name, phone, about, skills, links, ...) |
| POST/PATCH/DELETE | `/me/education[/:entryId]` | job seeker only |
| POST/PATCH/DELETE | `/me/experience[/:entryId]` | job seeker only |
| POST | `/me/resume` | job seeker only, `multipart/form-data` field `resume` — PDF, 5MB max |
| DELETE | `/me/resume` | job seeker only |
| GET | `/me/resume/view` \| `/me/resume/download` | job seeker only, streams the PDF |

**Companies** (`/api/companies`)
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/` | public list/search |
| GET | `/:id` | public, one company |
| GET | `/me` | recruiter's own company |
| PUT | `/me` | create (first call) or update (later calls) the recruiter's company |

**Jobs** (`/api/jobs`)
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/` | public search: `?q=&location=&workMode=&employmentType=&experience=fresher&minSalary=&sort=latest\|salary\|relevant&page=` |
| GET | `/:id` | public, one job |
| GET | `/mine` | recruiter's own jobs, any status, with `applicationsCount` |
| POST | `/` | recruiter (own company) or admin |
| PATCH \| DELETE | `/:id` | owning recruiter or admin |
| POST | `/:id/report` | job seeker flags a suspicious listing |

**Saved jobs** (`/api/saved-jobs`, job seeker only) — `GET /`, `POST { jobId }`, `DELETE /:jobId`

**Applications** (`/api/applications`)
| Method | Route | Notes |
| --- | --- | --- |
| POST | `/` | job seeker, `{ jobId, coverNote }` |
| GET | `/mine` | job seeker's own applications |
| GET | `/job/:jobId` | recruiter/admin, applicants for one job |
| GET | `/:id` | applicant, the job's recruiter, or admin |
| PATCH | `/:id/status` | recruiter/admin, `{ status }` |
| GET | `/:id/resume/view` \| `/:id/resume/download` | the applicant, the job's recruiter, or admin — streams the resume as it was at the moment of applying |

**Interviews** (`/api/interviews`)
| Method | Route | Notes |
| --- | --- | --- |
| POST | `/` | recruiter/admin, `{ applicationId, interviewDate, interviewTime, interviewType, meetingLink, notes }` — `meetingLink`/`meetingId` are ignored for `interviewType: "Video"` and auto-generated server-side instead (an in-app `/meeting/:meetingId` room, not a pasted URL) |
| GET | `/mine` | job seeker's own interviews |
| GET | `/recruiter/mine` | recruiter's own scheduled interviews |
| GET | `/meeting/:meetingId` | either participant (or admin) only — authorizes and returns display info for the video call room |
| PATCH | `/:id` | recruiter/admin — reschedule, change link, mark completed/cancelled |

**Video interviews.** `interviewType: "Video"` gets a real in-app call, not a pasted Zoom/Meet link:
the backend runs a Socket.IO signaling server (`backend/src/realtime/signaling.js`) on the same HTTP
port as the REST API, authenticated with the same JWT. It only ever relays small WebRTC handshake
messages (SDP offer/answer, ICE candidates) between the two browsers — camera/mic video goes directly
peer-to-peer and never touches the server. The frontend room is `frontend/src/pages/Meeting.jsx`, at
`/meeting/:meetingId`. To try it: schedule a Video interview, then open the resulting `/meeting/...`
link in two different logged-in sessions (e.g. one normal window as the recruiter, one incognito
window as the candidate) and allow camera/mic in both. Uses a public STUN server only (no TURN), which
covers most home/office networks but can fail to connect behind a strict corporate firewall or
symmetric NAT — adding a TURN relay would be the fix for that, not currently set up.

**Notifications** (`/api/notifications`) — `GET /`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`

**Admin** (`/api/admin`, admin only)
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/stats` | dashboard totals |
| GET | `/users` | `?role=&q=` |
| PATCH | `/users/:id/active` | deactivate/reactivate an account |
| GET | `/companies` | all companies |
| PATCH | `/companies/:id/verify` | toggle verified badge |
| GET \| POST | `/jobs` | list all / manually add a job — `POST` body takes `companyName` (auto-creates the company if it doesn't exist) or an existing `company` id |
| GET | `/applications` | all applications, platform-wide |
| GET | `/reported-jobs` | jobs with `reportCount > 0` |
| PATCH | `/reported-jobs/:id/dismiss` | resets `reportCount` to 0 |

Errors are always JSON: `{ "message": "..." }`, plus `errors` field-by-field on validation
failures. Status codes: 400 validation/bad input, 401 not logged in, 403 wrong role/not the owner,
404 not found, 409 conflict (duplicate email/application/save), 429 too many login attempts.

## Frontend

React + Vite + React Router, plain CSS (no Tailwind), role-aware from the ground up.

```bash
cd frontend
cp .env.example .env    # VITE_API_URL — defaults to /api, proxied to localhost:5000 in dev
npm install
npm run dev              # http://localhost:5173
```

**Routing** (`src/App.jsx`): three role-gated route trees under `RequireAuth` +
`RequireRole` (`components/RouteGuards.jsx`), plus routes anyone can reach —
`/jobs`, `/jobs/:id`, `/companies`, `/companies/:id` render inside `AdaptiveLayout`,
which swaps in the full dashboard shell if you're logged in or a simple public
header if you're not, so the same pages serve both a visitor and a signed-in user.

**Structure:**
- `layouts/` — `AppLayout` (Sidebar + Navbar, all authenticated pages), `PublicLayout`
  (logged-out header/footer), `AuthLayout` (login/register split panel), `AdaptiveLayout`
- `pages/public/`, `pages/auth/`, `pages/seeker/`, `pages/recruiter/`, `pages/admin/`,
  `pages/shared/` (Notifications, Settings — used by every role)
- `context/` — `AuthContext` (session + optimistic profile updates), `ToastContext`,
  `NotificationsContext` (polls the unread count every 30s for the navbar badge)
- `components/` — the shared UI kit (`JobCard`, `StatusPill`, `StatCard`, `Modal`,
  `Pagination`, `EmptyState`, `Navbar`, `Sidebar`) plus `RouteGuards`
- `utils/api.js` — the only file that calls the backend; every method maps 1:1 to a
  route in the table above
- `styles/` — shared foundation (buttons, forms, tables, badges, page layout) that
  every page builds on, imported once via `index.css`

**Design decisions worth knowing:**
- A recruiter's "My Jobs" list doesn't populate the company on each job (it's always
  their own company), so it's left as an id — only the public/admin job lists populate it.
- The recruiter dashboard's applicant-status counts come from fetching each job's
  applicants client-side (`Promise.all`) rather than a dedicated aggregate endpoint —
  fine at this project's scale, would want a real aggregation route with more jobs/data.
- Applying, saving a job, and changing an application's status all update local state
  optimistically before the request settles, then reconcile or roll back on error —
  the same pattern `AuthContext.updateProfile` already used for profile edits.

## Tests

```bash
cd backend
npm test
```

Two suites, neither needs a live MongoDB connection:
- `test/health.test.js` — boots the Express app, checks `/api/health` and 404 handling.
- `test/signaling.test.js` — boots the real Socket.IO signaling server (`Interview.findOne` is
  stubbed, since that's the only piece that needs a DB) and drives two authenticated socket
  connections through joining a meeting room, a stranger being refused, and relaying a fake
  offer/answer — the same contract `pages/Meeting.jsx` depends on.

Real endpoint tests over HTTP (signup/login, ownership checks, duplicate-application blocking, etc.)
are the natural next addition once you're exercising each route against a live database.

Note: `node --test test/` (pointing at the directory) fails to resolve on some Node versions — the
`test` script uses bare `node --test`, which auto-discovers `test/**/*.test.js` reliably instead.

## Deploying

Backend (Render, Railway, Fly, ...):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | random string, **32+ characters** (the server refuses to start otherwise) |
| `CLIENT_URL` | your frontend URL, e.g. `https://jobtrack.vercel.app` (comma separate several) |
| `TRUST_PROXY` | `1` — **required on most hosts.** Login/signup are rate limited to 30 requests per 15 minutes per IP; without this every visitor looks like the host's proxy and they all share one limit. |

Frontend: set `VITE_API_URL=https://your-backend.example.com/api` when building (see `frontend/.env.example`).

## Good to know

- **Ids are strings** (MongoDB ObjectIds), and every model's `toJSON` strips `_id`/`__v` in favor of
  a plain `id` field — see the comment in each model file explaining why the whitelist pattern is
  used instead of just deleting `passwordHash`.
- **Dates** (`applicationDeadline`, `interviewDate`) are `YYYY-MM-DD` strings and times are `HH:MM`,
  so there are no time-zone off-by-one-day bugs — see `utils/validators.js`.
- **Logging out** deletes the token in the browser. A JWT can't be revoked server-side; it simply
  expires after `JWT_EXPIRES_IN` (7 days by default).
- **Token storage.** Keeping the JWT in `localStorage` is the simplest approach, but any XSS bug could
  read it. httpOnly cookies are safer; that is a possible later upgrade.
- **A recruiter's company profile is a prerequisite for posting jobs** — `POST /api/jobs` returns 400
  until `PUT /api/companies/me` has been called once.
- **Deleting a job cascades** — its `Application` and `Interview` documents are removed with it, so
  nothing is left pointing at a job that no longer exists.

## End-to-end local test (job seeker -> recruiter -> video interview)

On a local development server, demo data is created automatically after MongoDB connects unless `SEED_DEMO=false`.
The demo recruiter account owns the sample jobs, so applications to those jobs can be reviewed by the recruiter.

Default demo recruiter:

```text
Email: demo-recruiter@jobtrack.local
Password: JobTrackDemo!2026
```

For a real two-account test:

1. Register one **Job Seeker** account.
2. Open **Profile** from the avatar/sidebar and upload a PDF resume. Fill in skills, education, experience and links if you want the recruiter view to show them.
3. Browse **Jobs**. Every demo job opens a real Job Details page with an internal **Apply Now** flow.
4. Apply. The application is saved in MongoDB and the recruiter's applicant list receives the candidate's profile, resume snapshot and cover note.
5. In a second browser/incognito window, log in as the demo recruiter above.
6. Open **My Jobs → applicants**, click the candidate, review the profile/resume and **Shortlist**.
7. Schedule a **Video** interview. JobTrack creates an in-app meeting room automatically.
8. The candidate sees it under **My Interviews** and can click **Join Video Interview**.
9. Open the same meeting from the recruiter **Interviews** page in the second browser. Allow camera/microphone in both windows.

The video room uses WebRTC with Socket.IO signaling. It is suitable for local testing; production reliability across restrictive NAT/firewalls requires a TURN relay.

## Final deployment architecture

The production file-storage path is now designed for an ephemeral host such as Render:

```text
Candidate browser
      |
      v
JobTrack API (Render)
      |
      +---- MongoDB Atlas  -> users, companies, jobs, applications, interviews, statuses
      |
      +---- Cloudinary     -> resume PDFs + profile photos
```

The backend no longer depends on Render's local disk for **new** resume/profile-photo uploads.
Multer uses memory storage, then the backend uploads the bytes to Cloudinary. MongoDB stores the
Cloudinary public id and secure URL. Application records keep a snapshot reference to the exact
resume object that was submitted, so replacing/deleting a candidate's current resume does not break
an existing application.

### Cloudinary setup

Create a free Cloudinary account and copy these three values from the dashboard into the backend's
production environment:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Never commit the real API secret to GitHub. `.env.example` only contains placeholders.

### Render

A ready-to-use `render.yaml` is included at the repository root. It creates the backend service with
`npm ci`, `npm start`, a health check, and placeholder secret variables. After the Render service is
created, set `CLIENT_URL` to the final Vercel frontend URL.

### Vercel

The `frontend/` folder includes `vercel.json` so React Router URLs continue to work after a direct
page refresh. Set:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

in the Vercel project environment before building.

### Important migration note

Resumes/photos uploaded to the old local `uploads/` folder by an earlier local version are not
moved automatically. They should be re-uploaded once after deploying this version. New uploads go
to Cloudinary and survive Render restarts/redeploys.
