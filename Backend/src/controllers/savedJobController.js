import { SavedJob } from "../models/SavedJob.js";

export async function listSavedJobs(req, res) {
  const saved = await SavedJob.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate({ path: "job", populate: { path: "company", select: "name logo" } });
  res.json(saved);
}

export async function saveJob(req, res) {
  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ message: "A job id is required." });
  try {
    const saved = await SavedJob.create({ user: req.userId, job: jobId });
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) return res.status(200).json({ message: "Already saved." });
    throw err;
  }
}

export async function unsaveJob(req, res) {
  await SavedJob.deleteOne({ user: req.userId, job: req.params.jobId });
  res.status(204).end();
}
