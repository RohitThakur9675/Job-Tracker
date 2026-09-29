import mongoose from "mongoose";
import crypto from "node:crypto";
import { Interview } from "../models/Interview.js";
import { Application } from "../models/Application.js";
import { notify } from "../utils/notify.js";

export async function scheduleInterview(req, res) {
  const { applicationId, interviewDate, interviewTime, interviewType, meetingLink, notes } = req.body || {};
  if (!applicationId || !mongoose.isObjectIdOrHexString(applicationId)) {
    return res.status(400).json({ message: "A valid application id is required." });
  }

  const application = await Application.findById(applicationId).populate("job");
  if (!application) return res.status(404).json({ message: "Application not found." });
  if (!application.job) return res.status(410).json({ message: "The job linked to this application is no longer available." });
  if (req.userRole !== "admin" && application.job.postedBy.toString() !== req.userId) {
    return res.status(403).json({ message: "You can only schedule interviews for your own jobs." });
  }

  // Video interviews get a real in-app room, not a pasted link — the recruiter
  // never has to find/paste a Zoom/Meet URL, and only the two matched users can
  // ever join it (see routes/interviews.js#getMeetingInfo and the signaling server).
  const isVideo = interviewType === "Video";
  const meetingId = isVideo ? crypto.randomUUID() : undefined;

  const interview = await Interview.create({
    application: application.id,
    job: application.job.id,
    candidate: application.applicant,
    recruiter: application.job.postedBy,
    interviewDate,
    interviewTime,
    interviewType,
    meetingLink: isVideo ? `/meeting/${meetingId}` : meetingLink,
    meetingId,
    notes,
  });

  application.status = "Interview Scheduled";
  await application.save();

  await notify({
    user: application.applicant,
    type: "interview_scheduled",
    title: "Interview scheduled",
    message: `Your interview for ${application.job.title} is set for ${interviewDate} at ${interviewTime}.`,
    relatedJob: application.job.id,
    relatedApplication: application.id,
  });

  res.status(201).json(interview);
}

export async function myInterviews(req, res) {
  const candidateId = new mongoose.Types.ObjectId(req.userId);
  const interviews = await Interview.aggregate([
    { $match: { candidate: candidateId } },
    { $sort: { interviewDate: 1, interviewTime: 1 } },
    { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "jobInfo" } },
    { $unwind: { path: "$jobInfo", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "companies", localField: "jobInfo.company", foreignField: "_id", as: "companyInfo" } },
    { $unwind: { path: "$companyInfo", preserveNullAndEmptyArrays: true } },
    { $set: { job: { $cond: [
      { $ifNull: ["$jobInfo._id", false] },
      { id: "$jobInfo._id", title: "$jobInfo.title", company: { id: "$companyInfo._id", name: "$companyInfo.name", logo: "$companyInfo.logo" } },
      null
    ] } } },
    { $project: { jobInfo: 0, companyInfo: 0 } },
  ]);
  res.json(interviews.map((iv) => ({ ...iv, id: iv._id.toString(), _id: undefined })));
}

export async function recruiterInterviews(req, res) {
  const recruiterId = new mongoose.Types.ObjectId(req.userId);
  const interviews = await Interview.aggregate([
    { $match: { recruiter: recruiterId } },
    { $sort: { interviewDate: 1, interviewTime: 1 } },
    { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "jobInfo" } },
    { $unwind: { path: "$jobInfo", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "users", localField: "candidate", foreignField: "_id", as: "candidateInfo" } },
    { $unwind: { path: "$candidateInfo", preserveNullAndEmptyArrays: true } },
    { $set: {
      job: { $cond: [{ $ifNull: ["$jobInfo._id", false] }, { id: "$jobInfo._id", title: "$jobInfo.title" }, null] },
      candidate: { $cond: [{ $ifNull: ["$candidateInfo._id", false] }, { id: "$candidateInfo._id", name: "$candidateInfo.name", email: "$candidateInfo.email", profilePhoto: "$candidateInfo.profilePhoto" }, null] },
    } },
    { $project: { jobInfo: 0, candidateInfo: 0 } },
  ]);
  res.json(interviews.map((iv) => ({ ...iv, id: iv._id.toString(), _id: undefined })));
}

// meetingLink/meetingId are deliberately not client-editable — they're fully
// server-derived (see below) so nobody can point a scheduled video interview
// at an arbitrary URL.
const EDITABLE = ["interviewDate", "interviewTime", "interviewType", "notes", "status"];

export async function updateInterview(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: "Interview not found." });
  }
  const interview = await Interview.findById(req.params.id).populate("job");
  if (!interview) return res.status(404).json({ message: "Interview not found." });
  if (!interview.job) return res.status(410).json({ message: "The job linked to this interview is no longer available." });
  if (req.userRole !== "admin" && interview.recruiter.toString() !== req.userId) {
    return res.status(403).json({ message: "You can only manage your own interviews." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const wasRescheduling = Boolean(body.interviewDate || body.interviewTime);
  const wasCancelling = body.status === "Cancelled";

  for (const key of EDITABLE) if (Object.hasOwn(body, key)) interview[key] = body[key];

  // Switching into/out of "Video" regenerates or clears the in-app meeting room.
  if (Object.hasOwn(body, "interviewType")) {
    if (interview.interviewType === "Video" && !interview.meetingId) {
      interview.meetingId = crypto.randomUUID();
      interview.meetingLink = `/meeting/${interview.meetingId}`;
    } else if (interview.interviewType !== "Video") {
      interview.meetingId = undefined;
      interview.meetingLink = "";
    }
  }

  await interview.save();

  let title = "Interview updated";
  let message = `Your interview for ${interview.job.title} has been updated.`;
  if (wasCancelling) {
    title = "Interview cancelled";
    message = `Your interview for ${interview.job.title} has been cancelled.`;
  } else if (wasRescheduling) {
    title = "Interview rescheduled";
    message = `Your interview for ${interview.job.title} has been rescheduled to ${interview.interviewDate} at ${interview.interviewTime}.`;
  }

  await notify({
    user: interview.candidate,
    type: "interview_updated",
    title,
    message,
    relatedJob: interview.job.id,
    relatedApplication: interview.application,
  });

  res.json(interview);
}

// Authorization + display info for the WebRTC meeting room (Section 12): only the
// interview's own candidate/recruiter (or an admin) ever gets a "yes, join" answer.
export async function getMeetingInfo(req, res) {
  const interview = await Interview.findOne({ meetingId: req.params.meetingId })
    .populate("job", "title")
    .populate("candidate", "name")
    .populate("recruiter", "name");
  if (!interview) return res.status(404).json({ message: "This meeting could not be found." });

  const isCandidate = interview.candidate.id === req.userId;
  const isRecruiter = interview.recruiter.id === req.userId;
  if (!isCandidate && !isRecruiter && req.userRole !== "admin") {
    return res.status(403).json({ message: "You don't have access to this meeting." });
  }
  if (interview.status === "Cancelled") {
    return res.status(410).json({ message: "This interview has been cancelled." });
  }

  res.json({
    interviewId: interview.id,
    jobTitle: interview.job?.title || "Interview",
    role: isCandidate ? "candidate" : "recruiter",
    otherPartyName: (isCandidate ? interview.recruiter?.name : interview.candidate?.name) || "the other participant",
    interviewDate: interview.interviewDate,
    interviewTime: interview.interviewTime,
    status: interview.status,
  });
}
