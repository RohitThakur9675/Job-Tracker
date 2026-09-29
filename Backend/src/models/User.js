import mongoose from "mongoose";
import { isEmail, isHttpUrl } from "../utils/validators.js";

export const ROLES = ["jobseeker", "recruiter", "admin"];
export const THEMES = ["light", "dark"];

const urlField = (max = 500) => ({
  type: String,
  trim: true,
  default: "",
  maxlength: [max, `{PATH} must be at most ${max} characters`],
  validate: { validator: isHttpUrl, message: "{PATH} must be a valid http(s) URL" },
});

// One entry in a job seeker's education history. Kept as a sub-document (with its
// own _id) so the frontend can edit/remove a single entry without resending the rest.
const educationSchema = new mongoose.Schema(
  {
    degree: {
      type: String,
      required: [true, "Degree is required"],
      trim: true,
      maxlength: [150, "Degree must be at most 150 characters"],
    },
    institution: {
      type: String,
      required: [true, "Institution is required"],
      trim: true,
      maxlength: [150, "Institution must be at most 150 characters"],
    },
    startYear: { type: Number, min: 1950, max: 2100 },
    endYear: { type: Number, min: 1950, max: 2100 },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
  },
  { timestamps: false }
);

// One entry in a job seeker's work history.
const experienceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [150, "Job title must be at most 150 characters"],
    },
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [150, "Company name must be at most 150 characters"],
    },
    startDate: { type: String, trim: true, default: "" }, // "YYYY-MM"
    endDate: { type: String, trim: true, default: "" }, // ignored when current=true
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
  },
  { timestamps: false }
);

// One entry in a job seeker's project list.
const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [150, "Project title must be at most 150 characters"],
    },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    link: urlField(300),
  },
  { timestamps: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: isEmail, message: "Please enter a valid email address" },
    },
    // select:false -> never loaded unless a query explicitly asks for it (login only)
    passwordHash: { type: String, required: true, select: false },

    // Every account has exactly one role for its whole lifetime. Public signup only
    // ever creates "jobseeker" or "recruiter" accounts (see routes/auth.js, Phase 2) —
    // "admin" accounts are created directly in the database, never through the API.
    role: {
      type: String,
      enum: { values: ROLES, message: "Invalid role" },
      required: [true, "Role is required"],
    },

    // Lets an admin disable a suspicious account without deleting its history.
    isActive: { type: Boolean, default: true },

    // --- Shared fields (every role) ---
    phone: { type: String, trim: true, default: "", maxlength: 20 },
    location: { type: String, trim: true, default: "", maxlength: 120 },
    profilePhoto: urlField(),
    profilePhotoPublicId: { type: String, trim: true, default: "", maxlength: 500 },
    theme: {
      type: String,
      enum: { values: THEMES, message: "Theme must be light or dark" },
      default: "light",
    },

    // --- Job seeker profile (Section 4 of the spec). Unused by recruiter/admin accounts. ---
    about: { type: String, trim: true, default: "", maxlength: 2000 },
    skills: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
      validate: { validator: (arr) => arr.length <= 50, message: "You can list at most 50 skills" },
    },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    // Set by POST/DELETE /users/me/resume (see userController + utils/storage.js),
    // never by the generic PATCH /users/me. storedPath is a path relative to the
    // resume storage root — resolved server-side only, never sent to the client.
    resume: {
      originalName: { type: String, trim: true, default: "", maxlength: 180 },
      storedPath: { type: String, trim: true, default: "" }, // legacy local-storage field
      publicId: { type: String, trim: true, default: "", maxlength: 500 },
      secureUrl: { type: String, trim: true, default: "", maxlength: 1200 },
      mimeType: { type: String, trim: true, default: "" },
      size: { type: Number, default: 0, min: 0 },
      uploadedAt: { type: Date, default: null },
    },
    linkedin: urlField(),
    github: urlField(),
    portfolio: urlField(),
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

// Explicit whitelist: the password hash (and anything added to the schema later
// without a deliberate decision) can never leak through res.json(user).
userSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      name: ret.name,
      email: ret.email,
      role: ret.role,
      isActive: ret.isActive,
      phone: ret.phone,
      location: ret.location,
      profilePhoto: ret.profilePhoto,
      theme: ret.theme,
      about: ret.about,
      skills: ret.skills,
      education: ret.education,
      experience: ret.experience,
      projects: ret.projects,
      // null when no resume has been uploaded yet; storedPath (server disk path)
      // is intentionally never included here — resumes are fetched through the
      // authenticated /users/me/resume/(view|download) endpoints instead.
      resume: (ret.resume?.publicId || ret.resume?.storedPath)
        ? {
            originalName: ret.resume.originalName,
            mimeType: ret.resume.mimeType,
            size: ret.resume.size,
            uploadedAt: ret.resume.uploadedAt,
          }
        : null,
      linkedin: ret.linkedin,
      github: ret.github,
      portfolio: ret.portfolio,
      createdAt: ret.createdAt,
    };
  },
});

export const User = mongoose.model("User", userSchema);
