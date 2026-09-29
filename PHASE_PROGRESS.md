# JobTrack Portal — Build Progress

Tracks what changed and why, so it can double as interview notes: for any
piece of this you should be able to explain what exists, how it connects to
the rest of the system, and what trade-off was made.

## Where this project came from

The uploaded codebase was a **personal job-application tracker**: one user
tracks the jobs *they* applied to elsewhere (company name typed in by hand,
no concept of a real job posting or a second role). The target is a
**multi-role job portal** (job seekers, recruiters, admin) where jobs are
real objects that recruiters post and seekers apply to — a different data
model, so both the backend and frontend were rebuilt.

## Backend — done ✅

**Models** (`backend/src/models/`): `User` (role: jobseeker/recruiter/admin,
plus the job-seeker profile — skills/education/experience/resume/links),
`Company`, `Job`, `Application`, `Interview`, `Notification`, `SavedJob`.

**Routes + controllers**: signup/login with roles, profile + education/
experience editing, company profiles, job posting/search/filter/sort, saving
jobs, applying + duplicate-block + withdraw, recruiter applicant management +
status updates (with notifications), interview scheduling with meeting links,
a notification feed, and an admin panel (stats, user/company management,
manual job posting for unregistered companies, reported-jobs review). Full
route table in `README.md` → "API reference".

**Security:** JWT carries the role, bcrypt + timing-safe login, rate-limited
auth, `sanitizeFilter`, ownership checks on every mutating route.

**To verify:** `cd backend && cp .env.example .env && npm install && npm run
dev && npm test` — see README for the full curl/Postman walkthrough.

## Frontend — done ✅

React + Vite + React Router + plain CSS, rebuilt page by page against the
new API. Full structure/route breakdown in `README.md` → "Frontend".

**What exists:** all 26 pages from Section 18 of the spec — public browsing
(Home, Jobs w/ search+filters, Job Details w/ apply flow, Companies,
Company Details), auth (role-picker signup, login), job seeker (dashboard,
profile w/ education+experience CRUD, applications w/ withdraw, saved jobs,
interviews w/ Join Interview), recruiter (dashboard, company profile, job
posting/editing, applicants w/ status changes + interview scheduling,
interviews list), admin (dashboard, users, companies w/ verify, jobs w/
manual add, applications oversight, reported-jobs review), plus shared
notifications and settings pages used by every role.

**Verification done without a live server:** every `.jsx`/`.js` file passes
an esbuild JSX/syntax check; every relative import across all ~46 files was
cross-checked against the target file's actual exports (default vs named) —
see `PHASE_PROGRESS.md`'s history for the two real bugs this caught
(`Companies.jsx` was sending a `search` query param the backend didn't
read — it reads `q`; `withdrawApplication` was wired into the frontend
before the backend route existed, so the route was added). What this
*doesn't* catch: whether a live MongoDB-backed flow actually behaves as
expected end to end — that still wants a real `npm run dev` + manual
click-through, or a Playwright/RTL test suite, neither of which exist yet.

**To verify:** `cd frontend && npm install && npm run dev` — signup as a
recruiter, create a company, post a job; signup as a job seeker (or use a
second browser profile) and apply; go back to the recruiter, shortlist and
schedule an interview; check the job seeker's "My Interviews" for the
Join Interview button and the notification bell for the update.

## Phase — real resume upload ✅

Replaced the pasted-URL `resumeUrl` field with an actual file: `multer`
disk storage (`backend/src/middleware/upload.js`), PDF-only + 5MB limit,
abstracted behind `backend/src/utils/storage.js` so a later move to S3/Cloud
Storage only touches that one file. `User.resume` holds the seeker's current
file; `Application.resumeSnapshot` is an immutable copy made at the moment of
applying, so a later profile-resume replace/delete never changes what a
recruiter already saw for a given application (spec Section 8).

New endpoints: `POST/DELETE /users/me/resume`, `GET /users/me/resume/(view|download)`,
`GET /applications/:id/resume/(view|download)` — the last one authorized to
the applicant, the recruiter who owns that job, or an admin only. Applying to
a job now 400s with "Please upload your resume before applying." if the
seeker has no resume on file, and pre-checks for a duplicate application
before touching the filesystem.

Frontend: `Profile.jsx` has a real Resume card (upload/view/download/replace/
delete); `MyApplications.jsx` and recruiter `Applicants.jsx` show the actual
submitted-resume snapshot instead of a link; the apply modal in `JobDetails.jsx`
shows the resume that will be submitted and disables Submit if none exists.

**Verified without a live MongoDB** (still the environment's constraint, see
below): backend syntax-checks clean; the existing health-check test suite
passes, which also proves every new route/controller/import wires up without
a typo (Express would fail to boot otherwise); a standalone script exercised
the real storage lifecycle end-to-end over actual HTTP — upload, snapshot-on-
apply, `/view` and `/download` headers, and confirmed deleting a profile
resume leaves an existing application's snapshot file untouched. Frontend:
`npm run build` succeeds with the new components.

**Not yet verified:** a real click-through against a live Mongo instance
(upload a PDF in the browser, apply, then check the recruiter sees it) —
same limitation as the rest of this project, since this environment can't
reach a MongoDB server.

## Phase — video interviews (WebRTC calling) ✅

Turned out the backend half of this was already mostly built in an earlier
phase and I'd mis-flagged it as missing in my original audit (a broken grep
chain silently skipped that check) — `meetingId` auto-generation, the
`/meeting/:meetingId` auth endpoint, and a full Socket.IO signaling server
(`backend/src/realtime/signaling.js`, JWT-authenticated, room-based,
authorization-checked) were already there and working. What was actually
missing was the frontend: no `socket.io-client`, no `/meeting/:meetingId`
route, no page that turns that signaling contract into an actual call.

Added `frontend/src/pages/Meeting.jsx` (+ `Meeting.css`): getUserMedia,
RTCPeerConnection with a deterministic offer/answer handshake (the later
joiner always initiates — no glare), mute/camera/leave controls, a floating
local-video PIP over the remote video, "Waiting for X…" state, a connection
status badge, and dedicated error states for blocked camera/mic, an
unauthorized/not-found meeting, and a cancelled interview. Mounted at
`/meeting/:meetingId`, auth-required but outside `AppLayout` (fullscreen, no
sidebar) and outside any single-role guard since both a candidate and a
recruiter land there. STUN-only (no TURN) — see the README's Interviews
section for what that does and doesn't cover.

Fixed three real bugs found while wiring this up:
- "Join Interview" (both seeker and recruiter interview lists) was
  `<a target="_blank">` instead of a client-side route — worked, but did a
  full page reload in a new tab instead of an in-app navigation.
- The recruiter's join button didn't disappear when an interview was
  cancelled (only checked `meetingLink` truthy, not `status`).
- The schedule-interview modal forced recruiters to type a meeting link for
  Video interviews even though the backend already silently discards it and
  auto-generates the in-app room — replaced with an explanatory note, and
  Notes' placeholder now hints at a phone number / address for Phone /
  In-person instead.

**Verified without a live MongoDB or a real browser camera** (same
environment constraint as before): added `backend/test/signaling.test.js`, a
permanent test that boots the real (unmocked) signaling server, mints real
JWTs, and drives two authenticated socket connections through join →
authorization-refused-for-a-stranger → peer-joined → SDP offer/answer relay
→ peer-left — this is the exact contract `Meeting.jsx` relies on, verified
end-to-end except for the actual browser media APIs. Also caught and fixed a
real portability bug: `node --test test/` fails to resolve on this Node
version while bare `node --test` doesn't — `npm test` now uses the latter.
Frontend builds clean.

**Not yet verified:** an actual two-browser call with real cameras — that
needs a live MongoDB and two real browser sessions, neither available here.

## Phase — search bug, dashboard performance, creator branding ✅

**Search bug (real, found by inspection, not guessed):** searching by company
name returned nothing. The job text index only covers `title`,
`requiredSkills`, `description` on the Job document itself — a company's name
lives on a separate `Company` document, so "Infosys" or "Google" never
matched anything. Fixed in `jobController.js#listJobs`: the query now also
looks up companies whose name matches and widens the filter to include their
jobs. Along the way, fixed a second latent bug this would have hit: the
experience-range filter and the new search filter both wanted to write to
`filter.$or`, which would have silently made one overwrite the other —
restructured onto `filter.$and` so both coexist. Also fixed an unescaped
`$regex` on both the location filter (pre-existing) and the new company-name
match — a search term with `(`, `+`, etc. could throw or match garbage
without `escapeRegExp` (new, in `utils/validators.js`).

**Performance ("bahut slow"), two real causes found and fixed:**
- `Jobs.jsx` fired a new `GET /api/jobs` request on every single keystroke
  while typing a search term — no debounce. Fixed: typing updates the input
  instantly, but the actual request waits ~350ms after typing stops.
- The recruiter dashboard did one `GET /applications/job/:jobId` request
  *per job the recruiter has posted*, just to compute a handful of stat
  counts — classic N+1, and the single biggest likely cause of a slow
  recruiter dashboard for anyone with more than a few jobs (this was already
  flagged as a known tradeoff in this README before now). Replaced with
  `GET /applications/recruiter/summary` (`applicationController.js`), which
  does the same job in exactly 2 queries total via `Application.aggregate`
  (status counts) + one `.find().limit(6)` (recent applications) — regardless
  of how many jobs the recruiter has.

Both are backed by real tests (mocked DB, but exercising the actual
filter-building/aggregation logic): `test/jobSearch.test.js` (3 tests — the
company-match fix, the $and/$or non-collision, and regex-escaping) and
`test/recruiterSummary.test.js` (2 tests — asserts exactly 2 application
queries fire no matter how many jobs are in the fixture, and the counts/
recent-list shape is correct).

**Creator branding:** a hardcoded, permanent "Rohit — Creator of JobTrack"
identity, deliberately built to be structurally incapable of changing based
on who's logged in — `components/CreatorBadge.jsx` takes no props tied to
auth/user state at all, just two hardcoded constants (name + photo path).
Placed in `Sidebar.jsx` (logged-in, all three roles — its own strip under the
header, since the header row itself is only ~240px wide and already tight)
and `PublicLayout.jsx` (logged-out — inline next to the "JobTrack" wordmark,
icon-only below 400px wide so it never crowds out Log in/Sign up). Footer
line updated to "© {year} JobTrack · Built by Rohit — a learning project,
not a real job board." No About/Info page exists in this project, so nothing
was added there (the request said only to add it if one already existed).
No photo was supplied, so `frontend/public/README-creator-photo.txt`
documents exactly where to drop one (`frontend/public/creator-rohit.jpg`);
until then the badge shows a clean "R" circle, never a broken-image icon.

**Verified:** full backend suite still green (10/10, all three test files),
frontend builds clean, and I grepped the actual production JS bundle to
confirm "Rohit", "Built by Rohit", "Creator of JobTrack", and the photo path
are really in the shipped output — not just the source.

## Known gaps / next steps

- No TURN server — calls behind a strict NAT/firewall may fail to connect
  peer-to-peer. Would need a TURN relay (e.g. coturn, or a hosted one) added
  to `ICE_SERVERS` in `Meeting.jsx`.
- No screen share (spec calls it out as "if practical" — skipped this pass
  to keep the call itself solid; would need `getDisplayMedia` + a track-replace
  on the existing `RTCPeerConnection`).
- No reschedule UI on the recruiter's Interviews page (Complete/Cancel exist;
  the backend already supports changing date/time via `PATCH /interviews/:id`,
  just no modal for it yet).
- Interview model has no `duration` or `title` field, so the schedule form
  doesn't collect them (the original mockup shows both) — would be a small
  schema + form addition.

- No automated frontend tests (RTL/Playwright) — everything above was
  verified statically (syntax + import/export correctness), not by running
  the app against a live backend, since this environment has no network
  access to `npm install` either project's dependencies.
- No password-reset or change-password flow — signup/login only.
- Profile photos and company logos are still pasted URLs, not uploads —
  resumes are the only file-upload flow so far (by design, this phase).
- `Company` has no DB-level unique index on `recruiter` — a race between two
  simultaneous "create my company" calls could in theory create two; the
  check-then-create in `companyController.upsertMyCompany` is good enough at
  this project's scale but isn't airtight.
- The recruiter dashboard's per-status applicant counts are computed by
  fetching every job's applicants client-side rather than through a
  dedicated aggregation endpoint — fine for a handful of jobs, not for scale.

## Finalization — Cloudinary + restored profile features

The v4 feature set was kept, while the profile features that had regressed were restored:
profile-photo upload/replace/remove, candidate projects CRUD, recruiter-facing projects, and the
authenticated candidate-profile route. Recruiter profile also supports its own profile photo.

New uploads use Cloudinary instead of Render/local disk. `User.resume` and
`Application.resumeSnapshot` retain Cloudinary ids/URLs while keeping legacy local fields for
backward compatibility. Resume application snapshots reference the exact Cloudinary object used at
application time. The old local upload directory is no longer used for new uploads.

Also fixed the recruiter company-profile form so a successful save keeps the saved values visible
instead of clearing the form.
