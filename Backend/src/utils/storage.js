// Legacy local-disk resume storage.
// Production uploads use Cloudinary; this module remains only for backwards compatibility with old local resumes.
//
// Everything that touches the filesystem for resumes lives here. Controllers
// and middleware never build a path themselves — they call these functions.
// That means moving to S3 / Cloud Storage later is a matter of rewriting this
// one file (destination(), streamResumeFile(), copyForApplication(), ...)
// with the same exported signatures; nothing else in the app has to change.
//
// Layout on disk (relative to ROOT):
//   profiles/<userId>/<generated>.pdf      -- a job seeker's current resume
//   applications/<applicationId>.pdf       -- an immutable snapshot copied in
//                                              at the moment of applying, so a
//                                              later profile-resume replace/delete
//                                              never changes what a recruiter
//                                              already saw for that application
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const RESUME_ROOT = path.resolve(process.cwd(), "uploads", "resumes");
const PROFILES_DIR = path.join(RESUME_ROOT, "profiles");
const APPLICATIONS_DIR = path.join(RESUME_ROOT, "applications");

fs.mkdirSync(PROFILES_DIR, { recursive: true });
fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });

// A resolved path must stay inside RESUME_ROOT. storedPath values are always
// server-generated (never taken from user input), so this should never trip —
// it's defense in depth, not the primary guarantee.
function assertInsideRoot(absPath) {
  const resolved = path.resolve(absPath);
  if (resolved !== RESUME_ROOT && !resolved.startsWith(RESUME_ROOT + path.sep)) {
    throw new Error("Refusing to access a path outside the resume storage root.");
  }
  return resolved;
}

export function absoluteResumePath(relativePath) {
  return assertInsideRoot(path.join(RESUME_ROOT, relativePath));
}

export function userProfileResumeDir(userId) {
  const dir = path.join(PROFILES_DIR, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function generateResumeFilename() {
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;
}

export function toRelativePath(absPath) {
  return path.relative(RESUME_ROOT, absPath);
}

export async function deleteFileIfExists(relativePath) {
  if (!relativePath) return;
  try {
    await fsp.unlink(absoluteResumePath(relativePath));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

// Copies the seeker's current resume into an immutable per-application file so
// it survives later replace/delete on the profile. applicationId is generated
// up front by the caller (new mongoose.Types.ObjectId()) so the filename is
// stable and the DB write and the copy can happen in either order.
export async function copyResumeForApplication(applicationId, sourceRelativePath) {
  const destAbs = path.join(APPLICATIONS_DIR, `${applicationId}.pdf`);
  await fsp.copyFile(absoluteResumePath(sourceRelativePath), destAbs);
  return toRelativePath(destAbs);
}

// Streams a stored PDF as the HTTP response. Used for both the seeker's own
// profile resume and an application's resume snapshot — same file shape, same
// headers, just a different storedPath and an authorization check upstream.
export function streamResumeFile(res, resumeMeta, { inline }) {
  const abs = absoluteResumePath(resumeMeta.storedPath);
  if (!fs.existsSync(abs)) {
    res.status(404).json({ message: "This resume file could not be found. Please re-upload it." });
    return;
  }
  const safeName = (resumeMeta.originalName || "resume.pdf").replace(/["\r\n]/g, "");
  res.setHeader("Content-Type", resumeMeta.mimeType || "application/pdf");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeName}"`);
  const stream = fs.createReadStream(abs);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ message: "Unable to read the resume file. Please try again." });
  });
  stream.pipe(res);
}
