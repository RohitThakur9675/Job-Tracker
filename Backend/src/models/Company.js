import mongoose from "mongoose";
import { isHttpUrl } from "../utils/validators.js";

const urlField = (max = 500) => ({
  type: String,
  trim: true,
  default: "",
  maxlength: [max, `{PATH} must be at most ${max} characters`],
  validate: { validator: isHttpUrl, message: "{PATH} must be a valid http(s) URL" },
});

const companySchema = new mongoose.Schema(
  {
    // The recruiter account that manages this company profile. null for a company
    // that only exists because an admin manually added a job for it (Section 11 of
    // the spec) — no recruiter has signed up for it yet. A recruiter is only ever
    // allowed to own one company; that rule is enforced in the route, not here,
    // because it must NOT apply to these ownerless admin-created companies.
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [150, "Company name must be at most 150 characters"],
    },
    logo: urlField(),
    description: { type: String, trim: true, default: "", maxlength: 3000 },
    website: urlField(),
    industry: { type: String, trim: true, default: "", maxlength: 100 },
    location: { type: String, trim: true, default: "", maxlength: 120 },
    size: { type: String, trim: true, default: "", maxlength: 30 }, // e.g. "51-200 employees"

    // Admin-only: shows a "Verified" badge and helps surface fake recruiter accounts.
    isVerified: { type: Boolean, default: false },
    // True when this profile was created by an admin (Section 11), not by the
    // company's own recruiter — lets the UI show "Added by Admin" instead of hiding it.
    addedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

companySchema.index({ recruiter: 1 });
companySchema.index({ name: "text" });

companySchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      recruiter: ret.recruiter ? ret.recruiter.toString() : null,
      name: ret.name,
      logo: ret.logo,
      description: ret.description,
      website: ret.website,
      industry: ret.industry,
      location: ret.location,
      size: ret.size,
      isVerified: ret.isVerified,
      addedByAdmin: ret.addedByAdmin,
      createdAt: ret.createdAt,
    };
  },
});

export const Company = mongoose.model("Company", companySchema);
