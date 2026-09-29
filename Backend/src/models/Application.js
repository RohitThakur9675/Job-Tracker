import mongoose from "mongoose";
import { todayISO } from "../utils/validators.js";

export const APPLICATION_STATUSES = [
  "Applied",
  "Shortlisted",
  "Interview Scheduled",
  "Selected",
  "Rejected",
];

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: `Status must be one of: ${APPLICATION_STATUSES.join(", ")}`,
      },
      default: "Applied",
    },

    // A copy of the resume file as it existed at the moment of applying (see
    // utils/storage.js#copyResumeForApplication). The seeker's resume on file
    // (User.resume) may later be replaced or deleted; this preserves what the
    // recruiter actually saw and keeps working regardless.
    resumeSnapshot: {
      originalName: { type: String, trim: true, default: "", maxlength: 180 },
      storedPath: { type: String, trim: true, default: "" }, // legacy local-storage field
      publicId: { type: String, trim: true, default: "", maxlength: 500 },
      secureUrl: { type: String, trim: true, default: "", maxlength: 1200 },
      mimeType: { type: String, trim: true, default: "" },
      size: { type: Number, default: 0, min: 0 },
      uploadedAt: { type: Date, default: null },
    },
    coverNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Cover note must be at most 2000 characters"],
    },

    appliedDate: { type: String, default: todayISO }, // "YYYY-MM-DD"
  },
  { timestamps: true }
);

// One application per (job, applicant) pair — the database itself blocks duplicates,
// so "prevent duplicate applications" (Section 7) can never be bypassed by a race.
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 }); // "My Applications"
applicationSchema.index({ job: 1, createdAt: -1 }); // a recruiter's "Applicants" list

applicationSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // Resumes are fetched through /applications/:id/resume/(view|download), which
    // does its own authorization check — the raw disk path never needs to leave the server.
    ret.resumeSnapshot = (ret.resumeSnapshot?.publicId || ret.resumeSnapshot?.storedPath)
      ? {
          originalName: ret.resumeSnapshot.originalName,
          mimeType: ret.resumeSnapshot.mimeType,
          size: ret.resumeSnapshot.size,
          uploadedAt: ret.resumeSnapshot.uploadedAt,
        }
      : null;
    return ret;
  },
});

export const Application = mongoose.model("Application", applicationSchema);
