import mongoose from "mongoose";
import { isHttpUrl, isValidDateString, isValidTimeString } from "../utils/validators.js";

export const INTERVIEW_TYPES = ["Video", "Phone", "In-person"];
export const INTERVIEW_STATUSES = ["Scheduled", "Completed", "Cancelled", "Rescheduled"];

// Video interviews are auto-assigned an in-app room ("/meeting/<meetingId>") rather
// than a recruiter-pasted external link — see interviewController.scheduleInterview.
function isMeetingLinkOrPath(value) {
  if (value === "") return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("/meeting/")) return true;
  return isHttpUrl(value);
}

const interviewSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    // Denormalized so "My Interviews" / a recruiter's interview calendar can be
    // queried directly, without joining through Application every time.
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    interviewDate: {
      type: String, // "YYYY-MM-DD"
      required: [true, "Interview date is required"],
      validate: { validator: isValidDateString, message: "Interview date must be a valid YYYY-MM-DD date" },
    },
    interviewTime: {
      type: String, // "HH:MM", 24-hour
      required: [true, "Interview time is required"],
      validate: { validator: isValidTimeString, message: "Interview time must be a valid HH:MM time" },
    },
    interviewType: {
      type: String,
      enum: { values: INTERVIEW_TYPES, message: "Invalid interview type" },
      default: "Video",
    },
    // What "Join Interview" opens. Required for a scheduled video interview; optional
    // for phone/in-person, where the notes field carries the phone number or address.
    meetingLink: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Meeting link must be at most 500 characters"],
      validate: { validator: isMeetingLinkOrPath, message: "Meeting link must be a valid link." },
    },
    // Only set for Video interviews (generated server-side in interviewController,
    // never taken from client input). The WebRTC signaling server and the frontend
    // /meeting/:meetingId room both key off this. No `default` so the sparse unique
    // index below only applies to documents that actually have one.
    meetingId: {
      type: String,
      trim: true,
    },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },

    status: {
      type: String,
      enum: { values: INTERVIEW_STATUSES, message: "Invalid interview status" },
      default: "Scheduled",
    },
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, interviewDate: 1 }); // "My Interviews"
interviewSchema.index({ recruiter: 1, interviewDate: 1 }); // recruiter's interview calendar
interviewSchema.index({ application: 1 });
interviewSchema.index({ meetingId: 1 }, { unique: true, sparse: true }); // video room lookup

// A scheduled video interview with no link would leave "Join Interview" with
// nothing to open. this.invalidate(...) folds this into a proper ValidationError
// instead of a raw throw, so it surfaces through the API as a normal 400.
interviewSchema.pre("validate", function requireLinkForScheduledVideo() {
  if (this.interviewType === "Video" && this.status === "Scheduled" && !this.meetingLink) {
    this.invalidate("meetingLink", "A meeting link is required for a scheduled video interview.");
  }
});

interviewSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Interview = mongoose.model("Interview", interviewSchema);
