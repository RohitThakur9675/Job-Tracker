import { Notification } from "../models/Notification.js";

// Shared by every controller that needs to raise a notification (Section 13 of the
// spec), so the create-and-shape logic lives in one place. A notification that fails
// to save is logged, not thrown — it should never block the action that triggered it
// (e.g. an application must still succeed even if the recruiter's notification fails).
export async function notify({ user, type, title, message, relatedJob, relatedApplication }) {
  try {
    await Notification.create({
      user,
      type,
      title,
      message,
      relatedJob: relatedJob || null,
      relatedApplication: relatedApplication || null,
    });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
}
