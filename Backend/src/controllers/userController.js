import mongoose from "mongoose";
import { User } from "../models/User.js";
import { isEmail } from "../utils/validators.js";
import {
  deleteFileIfExists,
  streamResumeFile,
} from "../utils/storage.js";
import {
  buildPhotoPublicId,
  buildResumePublicId,
  deleteFromCloudinary,
  streamCloudinaryFile,
  uploadToCloudinary,
} from "../utils/cloudinary.js";

const asString = (value) => (typeof value === "string" ? value : "");
const badRequest = (res, message) => res.status(400).json({ message });

const COMMON_EDITABLE = ["name", "phone", "location", "profilePhoto", "theme"];
const JOBSEEKER_EDITABLE = ["about", "skills", "linkedin", "github", "portfolio"];
const EDUCATION_FIELDS = ["degree", "institution", "startYear", "endYear", "description"];
const EXPERIENCE_FIELDS = ["title", "company", "startDate", "endDate", "current", "description"];
const PROJECT_FIELDS = ["title", "description", "link"];

function pick(body, fields) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const key of fields) if (Object.hasOwn(src, key)) out[key] = src[key];
  return out;
}

export async function updateMe(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const has = (key) => Object.hasOwn(body, key);

  if (has("email")) {
    const email = asString(body.email).trim().toLowerCase();
    if (!isEmail(email)) return badRequest(res, "Please enter a valid email address.");
    const owner = await User.findOne({ email }).select("_id");
    if (owner && owner.id !== user.id) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    user.email = email;
  }

  const editable = user.role === "jobseeker" ? [...COMMON_EDITABLE, ...JOBSEEKER_EDITABLE] : COMMON_EDITABLE;
  for (const key of editable) {
    if (has(key)) user[key] = body[key];
  }

  await user.save();
  res.json({ user });
}

export async function addEducation(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  user.education.push(pick(req.body, EDUCATION_FIELDS));
  await user.save();
  res.status(201).json({ user });
}

export async function updateEducation(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  const entry = user.education.id(req.params.entryId);
  if (!entry) return res.status(404).json({ message: "Education entry not found." });
  entry.set(pick(req.body, EDUCATION_FIELDS));
  await user.save();
  res.json({ user });
}

export async function deleteEducation(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  const entry = user.education.id(req.params.entryId);
  if (!entry) return res.status(404).json({ message: "Education entry not found." });
  entry.deleteOne();
  await user.save();
  res.json({ user });
}

export async function addExperience(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  user.experience.push(pick(req.body, EXPERIENCE_FIELDS));
  await user.save();
  res.status(201).json({ user });
}

export async function updateExperience(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  const entry = user.experience.id(req.params.entryId);
  if (!entry) return res.status(404).json({ message: "Experience entry not found." });
  entry.set(pick(req.body, EXPERIENCE_FIELDS));
  await user.save();
  res.json({ user });
}

export async function deleteExperience(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  const entry = user.experience.id(req.params.entryId);
  if (!entry) return res.status(404).json({ message: "Experience entry not found." });
  entry.deleteOne();
  await user.save();
  res.json({ user });
}

export async function addProject(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  user.projects.push(pick(req.body, PROJECT_FIELDS));
  await user.save();
  res.status(201).json({ user });
}

export async function updateProject(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  const entry = user.projects.id(req.params.entryId);
  if (!entry) return res.status(404).json({ message: "Project entry not found." });
  entry.set(pick(req.body, PROJECT_FIELDS));
  await user.save();
  res.json({ user });
}

export async function deleteProject(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found." });
  const entry = user.projects.id(req.params.entryId);
  if (!entry) return res.status(404).json({ message: "Project entry not found." });
  entry.deleteOne();
  await user.save();
  res.json({ user });
}

// Profile photo is uploaded to Cloudinary. The database stores the public URL and
// Cloudinary public id, so Render's ephemeral filesystem is never involved.
export async function uploadPhoto(req, res) {
  if (!req.file) return badRequest(res, "Please choose an image file to upload.");

  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });

  let uploaded;
  try {
    uploaded = await uploadToCloudinary(req.file.buffer, {
      resourceType: "image",
      publicId: buildPhotoPublicId(user.id),
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });
  } catch (err) {
    return res.status(err.status || 502).json({ message: err.message || "Could not upload your photo." });
  }

  const previousPublicId = user.profilePhotoPublicId;
  user.profilePhoto = uploaded.secureUrl;
  user.profilePhotoPublicId = uploaded.publicId;

  try {
    await user.save();
  } catch (err) {
    await deleteFromCloudinary({ publicId: uploaded.publicId, resourceType: "image" }).catch(() => {});
    throw err;
  }

  if (previousPublicId && previousPublicId !== uploaded.publicId) {
    deleteFromCloudinary({ publicId: previousPublicId, resourceType: "image" }).catch(() => {});
  }

  res.status(201).json({ user });
}

export async function deletePhoto(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });

  const previousPublicId = user.profilePhotoPublicId;
  user.profilePhoto = "";
  user.profilePhotoPublicId = "";
  await user.save();

  if (previousPublicId) {
    deleteFromCloudinary({ publicId: previousPublicId, resourceType: "image" }).catch(() => {});
  }

  res.json({ user });
}

export async function getPublicProfile(req, res) {
  const { id } = req.params;
  if (!id || !mongoose.isObjectIdOrHexString(id)) {
    return res.status(404).json({ message: "Profile not found." });
  }

  const target = await User.findById(id);
  if (!target) return res.status(404).json({ message: "Profile not found." });

  const canView =
    req.userRole === "admin" ||
    (req.userRole === "recruiter" && target.role === "jobseeker") ||
    req.userId === target.id;

  if (!canView) return res.status(403).json({ message: "You don't have access to this profile." });

  res.json({
    id: target.id,
    name: target.name,
    email: target.email,
    phone: target.phone,
    location: target.location,
    profilePhoto: target.profilePhoto,
    about: target.about,
    skills: target.skills || [],
    education: target.education || [],
    experience: target.experience || [],
    projects: target.projects || [],
    linkedin: target.linkedin,
    github: target.github,
    portfolio: target.portfolio,
    resume: (target.resume?.publicId || target.resume?.storedPath)
      ? {
          originalName: target.resume.originalName,
          mimeType: target.resume.mimeType,
          size: target.resume.size,
          uploadedAt: target.resume.uploadedAt,
        }
      : null,
  });
}

export async function uploadResume(req, res) {
  if (!req.file) return badRequest(res, "Please choose a PDF file to upload.");

  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });

  let uploaded;
  try {
    uploaded = await uploadToCloudinary(req.file.buffer, {
      resourceType: "raw",
      publicId: buildResumePublicId(user.id, req.file.originalname),
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });
  } catch (err) {
    return res.status(err.status || 502).json({ message: err.message || "Could not upload your resume." });
  }

  const previousStoredPath = user.resume?.storedPath;
  user.resume = {
    originalName: req.file.originalname.slice(0, 180),
    storedPath: "",
    publicId: uploaded.publicId,
    secureUrl: uploaded.secureUrl,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date(),
  };

  try {
    await user.save();
  } catch (err) {
    await deleteFromCloudinary({ publicId: uploaded.publicId, resourceType: "raw" }).catch(() => {});
    throw err;
  }

  // Old resumes are kept when they are referenced by existing applications only
  // through their immutable snapshot. The current profile's previous Cloudinary
  // object is safe to remove here because applications store the same object id
  // only as a snapshot reference; cleanup can be handled later if desired.
  // To avoid breaking old application snapshots, do not destroy previous Cloudinary
  // resumes automatically. They are small and can be cleaned up with a retention job.
  if (previousStoredPath) deleteFileIfExists(previousStoredPath).catch(() => {});
  res.status(201).json({ user });
}

export async function deleteResume(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });
  if (!user.resume?.publicId && !user.resume?.storedPath) {
    return res.status(404).json({ message: "No resume on file." });
  }

  const oldPublicId = user.resume?.publicId;
  const oldStoredPath = user.resume?.storedPath;
  user.resume = { originalName: "", storedPath: "", publicId: "", secureUrl: "", mimeType: "", size: 0, uploadedAt: null };
  await user.save();

  if (oldStoredPath) deleteFileIfExists(oldStoredPath).catch(() => {});
  // Keep Cloudinary resume objects so applications that already reference them
  // remain valid. They can be removed later by an ownership-aware cleanup job.
  void oldPublicId;

  res.json({ user });
}

async function serveOwnResume(req, res, { inline }) {
  const user = await User.findById(req.userId);
  if (!user?.resume?.publicId && !user?.resume?.storedPath) {
    return res.status(404).json({ message: "No resume on file." });
  }

  if (user.resume.publicId && user.resume.secureUrl) {
    return streamCloudinaryFile(res, user.resume.secureUrl, {
      inline,
      filename: user.resume.originalName,
      mimeType: user.resume.mimeType,
    });
  }

  // Legacy local resume support for development/migration.
  return streamResumeFile(res, user.resume, { inline });
}

export const viewResume = (req, res) => serveOwnResume(req, res, { inline: true });
export const downloadResume = (req, res) => serveOwnResume(req, res, { inline: false });
