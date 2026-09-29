import mongoose from "mongoose";

// Section 13 of the spec — every event a job seeker or recruiter should be told about.
export const NOTIFICATION_TYPES = [
  "application_submitted",
  "application_shortlisted",
  "application_rejected",
  "interview_scheduled",
  "interview_updated",
  "candidate_selected",
  "new_applicant",
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // recipient
    type: {
      type: String,
      enum: { values: NOTIFICATION_TYPES, message: "Invalid notification type" },
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title must be at most 150 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [500, "Message must be at most 500 characters"],
    },

    // Optional links so the UI can route straight to the job/application when tapped.
    relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    relatedApplication: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 }); // notification feed, newest first
notificationSchema.index({ user: 1, isRead: 1 }); // unread badge count

notificationSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
