import mongoose from "mongoose";
import { isHttpUrl, isValidDateString, todayISO } from "../utils/validators.js";

export const WORK_MODES = ["Remote", "Hybrid", "On-site"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];
export const JOB_STATUSES = ["Active", "Closed", "Draft"];
export const APPLICATION_TYPES = ["Internal", "External"];

function normalizeSkills(skills = []) {
  const seen = new Set();
  return skills
    .map((skill) => String(skill || "").trim())
    .filter(Boolean)
    .filter((skill) => {
      const key = skill.toLowerCase().replace(/[.\-\s]+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

const jobSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    // Who created this listing: a recruiter posting their own job, or an admin
    // adding one manually on behalf of a company that hasn't signed up (Section 11).
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [150, "Job title must be at most 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      maxlength: [8000, "Description must be at most 8000 characters"],
    },
    requiredSkills: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
      validate: { validator: (arr) => arr.length <= 30, message: "At most 30 required skills" },
    },

    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    location: { type: String, trim: true, default: "", maxlength: 120 },
    workMode: {
      type: String,
      enum: { values: WORK_MODES, message: "Invalid work mode" },
      required: [true, "Work mode is required"],
    },
    employmentType: {
      type: String,
      enum: { values: EMPLOYMENT_TYPES, message: "Invalid employment type" },
      required: [true, "Employment type is required"],
    },
    // Years of experience. experienceMin: 0 doubles as "Fresher" for the search filter.
    experienceMin: { type: Number, min: 0, default: 0 },
    experienceMax: { type: Number, min: 0 },

    openings: {
      type: Number,
      required: [true, "Number of openings is required"],
      min: [1, "There must be at least 1 opening"],
    },

    applicationDeadline: {
      type: String, // "YYYY-MM-DD", same string-date convention as the rest of the app
      trim: true,
      default: "",
      validate: { validator: isValidDateString, message: "Deadline must be a valid YYYY-MM-DD date" },
    },

    status: {
      type: String,
      enum: { values: JOB_STATUSES, message: "Invalid job status" },
      default: "Draft",
    },

    // Internal = apply inside JobTrack (creates an Application). External = the
    // "Apply on Company Website" button that sends the seeker to externalApplyUrl.
    applicationType: {
      type: String,
      enum: { values: APPLICATION_TYPES, message: "Invalid application type" },
      default: "Internal",
    },
    externalApplyUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "External apply link must be at most 500 characters"],
      validate: { validator: isHttpUrl, message: "External apply link must be a valid http(s) URL" },
    },

    isAdminPosted: { type: Boolean, default: false },
    // Local/demo catalog flag. Never exposed as a claim that a real company published the listing.
    isDemo: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0, min: 0 }, // bumped when a seeker reports this job
  },
  { timestamps: true }
);

// Job search (Section 6): free-text search across title/skills/description, plus the
// common "browse active jobs, newest first" and "a recruiter's own jobs" queries.
jobSchema.index({ title: "text", requiredSkills: "text", description: "text" });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ company: 1, createdAt: -1 });
jobSchema.index({ postedBy: 1, createdAt: -1 });
jobSchema.index({ location: 1, status: 1 });
jobSchema.index({ workMode: 1, experienceMin: 1, salaryMax: 1 });

// An externally-applied job is useless without somewhere to send the applicant.
// this.invalidate(...) (rather than throw) makes Mongoose fold this into a proper
// ValidationError, so it comes back through the API the same way any other
// field-validation failure does.
jobSchema.pre("validate", function normalizeJobFields() {
  if (Array.isArray(this.requiredSkills)) this.requiredSkills = normalizeSkills(this.requiredSkills);
  if (typeof this.location === "string") this.location = this.location.trim();
  if (typeof this.title === "string") this.title = this.title.trim();
});

jobSchema.pre("validate", function requireExternalUrl() {
  if (this.applicationType === "External" && !this.externalApplyUrl) {
    this.invalidate("externalApplyUrl", "An external apply link is required for externally-applied jobs.");
  }
});

// A job only accepts applications while it's Active and (if set) before its deadline.
jobSchema.methods.isAcceptingApplications = function isAcceptingApplications() {
  if (this.status !== "Active") return false;
  if (!this.applicationDeadline) return true;
  return this.applicationDeadline >= todayISO();
};

jobSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Job = mongoose.model("Job", jobSchema);
