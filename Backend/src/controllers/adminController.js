import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { Job } from "../models/Job.js";
import { Application } from "../models/Application.js";

export async function stats(req, res) {
  const [totalUsers, totalCompanies, totalJobs, totalApplications, reportedJobs] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    Company.countDocuments(),
    Job.countDocuments(),
    Application.countDocuments(),
    Job.countDocuments({ reportCount: { $gt: 0 } }),
  ]);
  res.json({ totalUsers, totalCompanies, totalJobs, totalApplications, reportedJobs });
}

export async function listUsers(req, res) {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.name = { $regex: q, $options: "i" };
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json(users);
}

export async function setUserActive(req, res) {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: !!req.body?.isActive }, { new: true });
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json(user);
}

export async function listCompaniesAdmin(req, res) {
  const companies = await Company.find().sort({ createdAt: -1 }).limit(200);
  res.json(companies);
}

export async function verifyCompany(req, res) {
  const company = await Company.findByIdAndUpdate(
    req.params.id,
    { isVerified: !!req.body?.isVerified },
    { new: true }
  );
  if (!company) return res.status(404).json({ message: "Company not found." });
  res.json(company);
}

// Admin manually adds a job for a company that hasn't signed up itself (Section 11).
// The company is looked up by name among admin-created companies, or created fresh.
export async function createJobForCompany(req, res) {
  const { companyName, ...jobData } = req.body || {};
  if (!companyName) return res.status(400).json({ message: "Company name is required." });

  let company = await Company.findOne({ name: companyName, recruiter: null });
  if (!company) company = await Company.create({ name: companyName, addedByAdmin: true });

  const job = await Job.create({
    ...jobData,
    company: company.id,
    postedBy: req.userId,
    isAdminPosted: true,
  });
  res.status(201).json(job);
}

export async function listAllJobs(req, res) {
  const jobs = await Job.find().sort({ createdAt: -1 }).limit(300).populate("company", "name");
  res.json(jobs);
}

export async function listAllApplications(req, res) {
  const applications = await Application.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .populate("job", "title")
    .populate("applicant", "name email");
  res.json(applications);
}

export async function reportedJobs(req, res) {
  const jobs = await Job.find({ reportCount: { $gt: 0 } }).sort({ reportCount: -1 }).populate("company", "name");
  res.json(jobs);
}

export async function dismissReport(req, res) {
  const job = await Job.findByIdAndUpdate(req.params.id, { reportCount: 0 }, { new: true });
  if (!job) return res.status(404).json({ message: "Job not found." });
  res.json(job);
}
