import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Job } from "../models/Job.js";
import { User } from "../models/User.js";
import { notify } from "../utils/notify.js";
import { copyResumeForApplication, streamResumeFile } from "../utils/storage.js";
import { streamCloudinaryFile } from "../utils/cloudinary.js";

export async function applyToJob(req, res) {
  const { jobId, coverNote } = req.body || {};
  if (!jobId || !mongoose.isObjectIdOrHexString(jobId)) {
    return res.status(400).json({ message: "A valid job id is required." });
  }

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: "Job not found." });
  if (job.applicationType === "External") {
    return res.status(400).json({ message: "This job accepts applications on the company website only." });
  }
  if (!job.isAcceptingApplications()) {
    return res.status(400).json({ message: "This job is no longer accepting applications." });
  }

  const applicant = await User.findById(req.userId);
  if (!applicant?.resume?.publicId && !applicant?.resume?.storedPath) {
    return res.status(400).json({ message: "Please upload your resume before applying." });
  }

  const alreadyApplied = await Application.exists({ job: jobId, applicant: req.userId });
  if (alreadyApplied) {
    return res.status(409).json({ message: "You've already applied to this job." });
  }

  const applicationId = new mongoose.Types.ObjectId();
  let resumeSnapshot;
  try {
    if (applicant.resume.publicId && applicant.resume.secureUrl) {
      // Cloudinary objects are immutable by public id. Keeping this public id in
      // the application creates an immutable reference even when the candidate
      // later replaces or deletes the current profile resume.
      resumeSnapshot = {
        originalName: applicant.resume.originalName,
        storedPath: "",
        publicId: applicant.resume.publicId,
        secureUrl: applicant.resume.secureUrl,
        mimeType: applicant.resume.mimeType,
        size: applicant.resume.size,
        uploadedAt: applicant.resume.uploadedAt,
      };
    } else {
      const storedPath = await copyResumeForApplication(applicationId, applicant.resume.storedPath);
      resumeSnapshot = {
        originalName: applicant.resume.originalName,
        storedPath,
        publicId: "",
        secureUrl: "",
        mimeType: applicant.resume.mimeType,
        size: applicant.resume.size,
        uploadedAt: applicant.resume.uploadedAt,
      };
    }
  } catch (err) {
    console.error("Could not snapshot resume for application:", err);
    return res.status(500).json({ message: "Unable to submit your application right now. Please try again." });
  }

  let application;
  try {
    application = await Application.create({
      _id: applicationId,
      job: jobId,
      applicant: req.userId,
      resumeSnapshot,
      coverNote: typeof coverNote === "string" ? coverNote.slice(0, 2000) : "",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You've already applied to this job." });
    }
    throw err;
  }

  await notify({
    user: job.postedBy,
    type: "new_applicant",
    title: "New applicant",
    message: `${applicant.name} applied to ${job.title}.`,
    relatedJob: job.id,
    relatedApplication: application.id,
  });

  res.status(201).json(application);
}

export async function myApplications(req, res) {
  const applications = await Application.find({ applicant: req.userId })
    .sort({ createdAt: -1 })
    .populate({ path: "job", populate: { path: "company", select: "name logo" } });
  res.json(applications);
}

export async function getApplication(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: "Application not found." });
  }
  const application = await Application.findById(req.params.id)
    .populate("job")
    .populate("applicant", "name email profilePhoto skills location phone about linkedin github portfolio education experience projects");
  if (!application) return res.status(404).json({ message: "Application not found." });

  if (!application.job) return res.status(410).json({ message: "The job linked to this application is no longer available." });
  const isOwner = application.applicant.id === req.userId;
  const isRecruiterOwner = req.userRole === "recruiter" && application.job.postedBy.toString() === req.userId;
  if (!isOwner && !isRecruiterOwner && req.userRole !== "admin") {
    return res.status(403).json({ message: "You don't have access to this application." });
  }
  res.json(application);
}

// Applicants for one of the recruiter's own jobs.
// Recruiter dashboard summary (Section 7): status counts + the 6 most recent
// applications across every job this recruiter has posted, in exactly 2 queries
// total regardless of how many jobs they have. Replaces the old approach of
// fetching each job's full applicant list separately (see PHASE_PROGRESS.md —
// that was an N-HTTP-requests-per-dashboard-load pattern, the single biggest
// cause of a slow recruiter dashboard).
export async function recruiterSummary(req, res) {
  const jobs = await Job.find({ postedBy: req.userId }, "title").lean();
  if (jobs.length === 0) {
    return res.json({ totalApplicants: 0, shortlisted: 0, selected: 0, recent: [] });
  }
  const jobIds = jobs.map((j) => j._id);
  const jobTitleById = new Map(jobs.map((j) => [j._id.toString(), j.title]));

  const [statusCounts, recentRaw] = await Promise.all([
    // Use aggregation for this dashboard summary so a legacy/orphaned application
    // can never make Mongoose try to cast a bad `job` value while hydrating it.
    Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      { $lookup: { from: "users", localField: "applicant", foreignField: "_id", as: "applicantInfo" } },
      { $unwind: { path: "$applicantInfo", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, job: 1, status: 1, createdAt: 1, applicantName: "$applicantInfo.name" } },
    ]),
  ]);

  const countMap = Object.fromEntries(statusCounts.map((c) => [c._id, c.count]));
  const recent = recentRaw.map((app) => ({
    id: app._id.toString(),
    status: app.status,
    createdAt: app.createdAt,
    applicant: { name: app.applicantName || "Candidate" },
    jobTitle: app.job && jobTitleById.get(app.job.toString()) || "Job no longer available",
  }));

  res.json({
    totalApplicants: statusCounts.reduce((sum, c) => sum + c.count, 0),
    shortlisted: countMap.Shortlisted || 0,
    selected: countMap.Selected || 0,
    recent,
  });
}

export async function jobApplicants(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.jobId)) {
    return res.status(404).json({ message: "Job not found." });
  }
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found." });
  if (req.userRole !== "admin" && job.postedBy.toString() !== req.userId) {
    return res.status(403).json({ message: "You can only view applicants for your own jobs." });
  }

  const applications = await Application.find({ job: job.id })
    .sort({ createdAt: -1 })
    .populate("applicant", "name email profilePhoto skills location phone about linkedin github portfolio education experience projects");
  res.json(applications);
}

const STATUS_NOTIFICATIONS = {
  Shortlisted: { type: "application_shortlisted", title: "You've been shortlisted" },
  Rejected: { type: "application_rejected", title: "Application update" },
  Selected: { type: "candidate_selected", title: "Congratulations!" },
};
const ALLOWED_STATUSES = ["Applied", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];

export async function updateApplicationStatus(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: "Application not found." });
  }
  const application = await Application.findById(req.params.id).populate("job");
  if (!application) return res.status(404).json({ message: "Application not found." });
  if (!application.job) return res.status(410).json({ message: "The job linked to this application is no longer available." });
  if (req.userRole !== "admin" && application.job.postedBy.toString() !== req.userId) {
    return res.status(403).json({ message: "You can only manage applicants for your own jobs." });
  }

  const { status } = req.body || {};
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." });

  application.status = status;
  await application.save();

  const notice = STATUS_NOTIFICATIONS[status];
  if (notice) {
    const messages = {
      Shortlisted: `You've been shortlisted for ${application.job.title}.`,
      Rejected: `Your application for ${application.job.title} was not selected at this time.`,
      Selected: `You've been selected for ${application.job.title}.`,
    };
    await notify({
      user: application.applicant,
      type: notice.type,
      title: notice.title,
      message: messages[status],
      relatedJob: application.job.id,
      relatedApplication: application.id,
    });
  }

  res.json(application);
}

// A seeker can only withdraw an application before a recruiter has acted on it —
// once it's Shortlisted/Rejected/etc. there's a decision on record, so it stays.
export async function withdrawApplication(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: "Application not found." });
  }
  const application = await Application.findOne({ _id: req.params.id, applicant: req.userId });
  if (!application) return res.status(404).json({ message: "Application not found." });
  if (application.status !== "Applied") {
    return res.status(400).json({ message: "This application is already being processed and can't be withdrawn." });
  }
  await application.deleteOne();
  res.status(204).end();
}

// Resume access for one application (Section 8 + Section 33): the applicant who
// submitted it, the recruiter who owns the job it was submitted to, or an admin —
// nobody else. Deliberately fetches only what's needed for that check (no
// populate) rather than reusing getApplication's heavier query.
async function serveApplicationResume(req, res, { inline }) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: "Application not found." });
  }
  const application = await Application.findById(req.params.id).populate("job", "postedBy");
  if (!application) return res.status(404).json({ message: "Application not found." });
  if (!application.job) return res.status(410).json({ message: "The job linked to this application is no longer available." });

  const isOwner = application.applicant.toString() === req.userId;
  const isRecruiterOwner = req.userRole === "recruiter" && application.job.postedBy.toString() === req.userId;
  if (!isOwner && !isRecruiterOwner && req.userRole !== "admin") {
    return res.status(403).json({ message: "You don't have access to this resume." });
  }
  if (!application.resumeSnapshot?.publicId && !application.resumeSnapshot?.storedPath) {
    return res.status(404).json({ message: "No resume was attached to this application." });
  }

  if (application.resumeSnapshot.publicId && application.resumeSnapshot.secureUrl) {
    return streamCloudinaryFile(res, application.resumeSnapshot.secureUrl, {
      inline,
      filename: application.resumeSnapshot.originalName,
      mimeType: application.resumeSnapshot.mimeType,
    });
  }

  return streamResumeFile(res, application.resumeSnapshot, { inline });
}

export const viewApplicationResume = (req, res) => serveApplicationResume(req, res, { inline: true });
export const downloadApplicationResume = (req, res) => serveApplicationResume(req, res, { inline: false });
