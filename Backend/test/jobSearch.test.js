import { test } from "node:test";
import assert from "node:assert/strict";
import { Job } from "../src/models/Job.js";
import { Company } from "../src/models/Company.js";
import { listJobs } from "../src/controllers/jobController.js";

// A minimal stand-in for Mongoose's chainable-and-awaitable query object:
// .sort().skip().limit().populate() must each return `this`, and the whole
// thing must be awaitable (resolves to `result`). No live MongoDB needed —
// this only checks that listJobs builds the *filter* object correctly, which
// is exactly where the company-name search bug and the $or collision lived.
function fakeQuery(result) {
  const q = {
    sort: () => q,
    skip: () => q,
    limit: () => q,
    populate: () => q,
    then: (resolve) => resolve(result).then ?? resolve(result),
  };
  // proper thenable
  q.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return q;
}

function fakeRes() {
  return {
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("job search: query string also matches the company name, not just job fields", async () => {
  const originalCompanyFind = Company.find;
  const originalJobFind = Job.find;
  const originalCountDocuments = Job.countDocuments;

  let capturedFilter = null;
  Company.find = (query) => {
    assert.equal(query.name.$regex, "Infosys"); // escaped form of a plain word is itself
    return { lean: async () => [{ _id: "company-abc-1" }, { _id: "company-abc-2" }] };
  };
  Job.find = (filter) => {
    capturedFilter = filter;
    return fakeQuery([]);
  };
  Job.countDocuments = async () => 0;

  try {
    const res = fakeRes();
    await listJobs({ query: { q: "Infosys" } }, res);

    // The core fix: the filter must match EITHER the job's own text-indexed fields
    // OR any job posted by a company whose name matched — not $text alone.
    assert.ok(Array.isArray(capturedFilter.$and), "expected an $and wrapper");
    const searchClause = capturedFilter.$and.find((c) => c.$or);
    assert.ok(searchClause, "expected an $or clause combining text search and company match");
    assert.deepEqual(searchClause.$or[0], { $text: { $search: "Infosys" } });
    assert.deepEqual(searchClause.$or[1], { company: { $in: ["company-abc-1", "company-abc-2"] } });
    assert.equal(res.body.jobs.length, 0);
  } finally {
    Company.find = originalCompanyFind;
    Job.find = originalJobFind;
    Job.countDocuments = originalCountDocuments;
  }
});

test("job search: text search and the 1-4yr experience range don't clobber each other's $or", async () => {
  const originalCompanyFind = Company.find;
  const originalJobFind = Job.find;
  const originalCountDocuments = Job.countDocuments;

  let capturedFilter = null;
  Company.find = () => ({ lean: async () => [] }); // no matching company this time
  Job.find = (filter) => {
    capturedFilter = filter;
    return fakeQuery([]);
  };
  Job.countDocuments = async () => 0;

  try {
    const res = fakeRes();
    await listJobs({ query: { q: "react developer", experience: "2" } }, res);

    assert.equal(capturedFilter.experienceMin.$lte, 2);
    // Both the experience-range $or and the search $or must survive, each in its own
    // $and slot — before this fix, the second assignment would have silently
    // overwritten the first since both used to write to the same top-level `$or` key.
    assert.equal(capturedFilter.$and.length, 2);
    const hasExperienceOr = capturedFilter.$and.some((c) => c.$or?.some((x) => "experienceMax" in x));
    const hasSearchOr = capturedFilter.$and.some((c) => c.$or?.some((x) => "$text" in x));
    assert.ok(hasExperienceOr, "experience $or clause is missing");
    assert.ok(hasSearchOr, "search $or clause is missing");
  } finally {
    Company.find = originalCompanyFind;
    Job.find = originalJobFind;
    Job.countDocuments = originalCountDocuments;
  }
});

test("job search: special regex characters in the query don't break the search", async () => {
  const originalCompanyFind = Company.find;
  const originalJobFind = Job.find;
  const originalCountDocuments = Job.countDocuments;

  Company.find = (query) => {
    // "C++ (Delhi)" must be escaped before reaching $regex, or this throws / matches garbage.
    assert.doesNotThrow(() => new RegExp(query.name.$regex));
    return { lean: async () => [] };
  };
  Job.find = () => fakeQuery([]);
  Job.countDocuments = async () => 0;

  try {
    const res = fakeRes();
    await listJobs({ query: { q: "C++ (Delhi)", location: "Gurgaon (NCR)" } }, res);
    assert.equal(res.body.jobs.length, 0); // just needs to not throw
  } finally {
    Company.find = originalCompanyFind;
    Job.find = originalJobFind;
    Job.countDocuments = originalCountDocuments;
  }
});
