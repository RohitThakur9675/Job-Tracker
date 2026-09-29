import mongoose from "mongoose";
import { Job, WORK_MODES } from "../models/Job.js";
import { Company } from "../models/Company.js";
import { Application } from "../models/Application.js";
import { Interview } from "../models/Interview.js";
import { escapeRegExp } from "../utils/validators.js";

const EDITABLE = [
  "title",
  "description",
  "requiredSkills",
  "salaryMin",
  "salaryMax",
  "location",
  "workMode",
  "employmentType",
  "experienceMin",
  "experienceMax",
  "openings",
  "applicationDeadline",
  "status",
  "applicationType",
  "externalApplyUrl",
];
function pick(body) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const key of EDITABLE) if (Object.hasOwn(src, key)) out[key] = src[key];
  return out;
}

// Public job search (Section 6): text search + filters + sorting + pagination.
export async function listJobs(req, res) {
  const { q, location, workMode, employmentType, experience, minSalary, sort, page, company } = req.query;
  const filter = { status: "Active" };
  const andClauses = [];

  if (typeof location === "string" && location.trim()) {
    const locationText = location.trim();
    const city = locationText.split(",")[0].trim();
    filter.location = { $regex: escapeRegExp(city || locationText), $options: "i" };
  }
  if (WORK_MODES.includes(workMode)) filter.workMode = workMode;
  if (typeof employmentType === "string" && employmentType) filter.employmentType = employmentType;
  if (experience !== undefined && experience !== "" && !Number.isNaN(Number(experience))) {
    const years = Math.max(0, Number(experience));
    if (years === 0) {
      filter.experienceMin = 0;
    } else if (years >= 5) {
      filter.experienceMin = { $gte: 5 };
    } else {
      filter.experienceMin = { $lte: years };
      andClauses.push({
        $or: [{ experienceMax: { $exists: false } }, { experienceMax: null }, { experienceMax: { $gte: years } }],
      });
    }
  }
  if (minSalary && !Number.isNaN(Number(minSalary))) filter.salaryMax = { $gte: Number(minSalary) };
  if (company && mongoose.isObjectIdOrHexString(company)) filter.company = company;

  // Free-text search intentionally uses escaped regexes instead of relying on MongoDB's
  // $text/$meta scoring. That keeps search reliable across local MongoDB installs and
  // still covers the fields a job seeker actually types: title, skills, description,
  // or company name. The dataset can later move to Atlas Search without changing the UI.
  if (typeof q === "string" && q.trim()) {
    const term = q.trim();
    const pattern = escapeRegExp(term);
    const matchingCompanies = await Company.find({ name: { $regex: pattern, $options: "i" } }, "_id").lean();
    const searchOr = [
      { title: { $regex: pattern, $options: "i" } },
      { requiredSkills: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
    ];
    if (matchingCompanies.length) searchOr.push({ company: { $in: matchingCompanies.map((c) => c._id) } });
    andClauses.push({ $or: searchOr });
  }

  if (andClauses.length) filter.$and = andClauses;

  const sortMap = {
    latest: { createdAt: -1 },
    salary: { salaryMax: -1 },
    relevant: { createdAt: -1 },
  };
  const sortSpec = sortMap[sort] || sortMap.latest;
  const projection = {};

  const pageNum = Math.max(1, Number(page) || 1);
  const limit = 20;

  const [jobs, total] = await Promise.all([
    Job.find(filter, projection)
      .sort(sortSpec)
      .skip((pageNum - 1) * limit)
      .limit(limit)
      .populate("company", "name logo location isVerified"),
    Job.countDocuments(filter),
  ]);

  res.json({ jobs, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function getJob(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: "Job not found." });
  const job = await Job.findById(req.params.id).populate("company");
  if (!job) return res.status(404).json({ message: "Job not found." });
  res.json(job);
}

export async function createJob(req, res) {
  let companyId;
  if (req.userRole === "admin") {
    if (!req.body?.company || !mongoose.isObjectIdOrHexString(req.body.company)) {
      return res.status(400).json({ message: "A valid company id is required." });
    }
    companyId = req.body.company;
  } else {
    const company = await Company.findOne({ recruiter: req.userId });
    if (!company) return res.status(400).json({ message: "Create your company profile before posting a job." });
    companyId = company.id;
  }

  const job = await Job.create({
    ...pick(req.body),
    company: companyId,
    postedBy: req.userId,
    isAdminPosted: req.userRole === "admin",
  });
  res.status(201).json(job);
}

async function loadOwnedJob(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    res.status(404).json({ message: "Job not found." });
    return null;
  }
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404).json({ message: "Job not found." });
    return null;
  }
  if (req.userRole !== "admin" && job.postedBy.toString() !== req.userId) {
    res.status(403).json({ message: "You can only manage jobs you posted." });
    return null;
  }
  return job;
}

export async function updateJob(req, res) {
  const job = await loadOwnedJob(req, res);
  if (!job) return;
  job.set(pick(req.body));
  await job.save();
  res.json(job);
}

export async function deleteJob(req, res) {
  const job = await loadOwnedJob(req, res);
  if (!job) return;
  // Cascade so a deleted job never leaves orphaned applications/interviews behind.
  await Interview.deleteMany({ job: job.id });
  await Application.deleteMany({ job: job.id });
  await job.deleteOne();
  res.status(204).end();
}

// Recruiter's "My Jobs" — includes how many applications each job has received.
export async function listMyJobs(req, res) {
  const jobs = await Job.find({ postedBy: req.userId }).sort({ createdAt: -1 });
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: "$job", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  res.json(jobs.map((j) => ({ ...j.toJSON(), applicationsCount: countMap.get(j.id) || 0 })));
}

export async function reportJob(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: "Job not found." });
  const job = await Job.findByIdAndUpdate(req.params.id, { $inc: { reportCount: 1 } }, { new: true });
  if (!job) return res.status(404).json({ message: "Job not found." });
  res.json({ message: "Thanks — this job has been reported to our admin team." });
}
