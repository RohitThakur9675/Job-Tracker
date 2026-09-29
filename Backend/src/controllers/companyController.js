import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { Job } from "../models/Job.js";

const EDITABLE = ["name", "logo", "description", "website", "industry", "location", "size"];
function pick(body) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const key of EDITABLE) if (Object.hasOwn(src, key)) out[key] = src[key];
  return out;
}

export async function getMyCompany(req, res) {
  const company = await Company.findOne({ recruiter: req.userId });
  if (!company) return res.status(404).json({ message: "You haven't created a company profile yet." });
  res.json(company);
}

// Upsert: the first call creates the profile, later calls edit it. One recruiter -> one company.
export async function upsertMyCompany(req, res) {
  let company = await Company.findOne({ recruiter: req.userId });
  if (company) {
    company.set(pick(req.body));
    await company.save();
    return res.json(company);
  }

  if (!req.body?.name) return res.status(400).json({ message: "Company name is required." });
  company = await Company.create({ ...pick(req.body), recruiter: req.userId });
  res.status(201).json(company);
}

export async function getCompany(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: "Company not found." });
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: "Company not found." });
  res.json(company);
}

export async function listCompanies(req, res) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = q
    ? {
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { industry: { $regex: escaped, $options: "i" } },
          { location: { $regex: escaped, $options: "i" } },
        ],
      }
    : {};
  const companies = await Company.find(filter).sort({ createdAt: -1 }).limit(100);
  const ids = companies.map((company) => company._id);
  const counts = ids.length
    ? await Job.aggregate([
        { $match: { company: { $in: ids }, status: "Active" } },
        { $group: { _id: "$company", count: { $sum: 1 } } },
      ])
    : [];
  const countMap = new Map(counts.map((row) => [row._id.toString(), row.count]));
  res.json(companies.map((company) => ({ ...company.toJSON(), activeJobsCount: countMap.get(company.id) || 0 })));
}
