import { test } from "node:test";
import assert from "node:assert/strict";
import { Job } from "../src/models/Job.js";
import { Application } from "../src/models/Application.js";
import { recruiterSummary } from "../src/controllers/applicationController.js";

function fakeRes() {
  return {
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("recruiter summary: exactly 2 application queries regardless of job count, correct counts + recent list", async () => {
  const originalJobFind = Job.find;
  const originalAggregate = Application.aggregate;
  const originalFind = Application.find;

  const jobs = [
    { _id: "job1", title: "Frontend Developer" },
    { _id: "job2", title: "Backend Developer" },
    { _id: "job3", title: "Backend Developer" }, // recruiter has several jobs — this is exactly the N+1 case
  ];

  let applicationQueryCount = 0;

  Job.find = (query, projection) => {
    assert.equal(query.postedBy, "recruiter-1");
    assert.equal(projection, "title");
    return { lean: async () => jobs };
  };

  Application.aggregate = async (pipeline) => {
    applicationQueryCount += 1;
    assert.deepEqual(pipeline[0].$match.job.$in, ["job1", "job2", "job3"]);
    return [
      { _id: "Applied", count: 5 },
      { _id: "Shortlisted", count: 2 },
      { _id: "Selected", count: 1 },
      { _id: "Rejected", count: 3 },
    ];
  };

  Application.find = (query) => {
    applicationQueryCount += 1;
    assert.deepEqual(query.job.$in, ["job1", "job2", "job3"]);
    const chain = {
      sort: () => chain,
      limit: () => chain,
      select: () => chain,
      populate: () => chain,
      lean: async () => [
        { _id: "app1", status: "Applied", createdAt: "2026-09-20", job: "job1", applicant: { name: "Rohit" } },
        { _id: "app2", status: "Shortlisted", createdAt: "2026-09-19", job: "job2", applicant: { name: "Priya" } },
      ],
    };
    return chain;
  };

  try {
    const res = fakeRes();
    await recruiterSummary({ userId: "recruiter-1" }, res);

    // The whole point of this endpoint: 2 queries total, never N (one per job).
    assert.equal(applicationQueryCount, 2);

    assert.equal(res.body.totalApplicants, 11); // 5 + 2 + 1 + 3
    assert.equal(res.body.shortlisted, 2);
    assert.equal(res.body.selected, 1);
    assert.equal(res.body.recent.length, 2);
    assert.equal(res.body.recent[0].applicant.name, "Rohit");
    assert.equal(res.body.recent[0].jobTitle, "Frontend Developer"); // joined from the jobs list, not a populate
    assert.equal(res.body.recent[1].jobTitle, "Backend Developer");
  } finally {
    Job.find = originalJobFind;
    Application.aggregate = originalAggregate;
    Application.find = originalFind;
  }
});

test("recruiter summary: a recruiter with no jobs gets zeros without querying applications at all", async () => {
  const originalJobFind = Job.find;
  const originalAggregate = Application.aggregate;
  let aggregateCalled = false;

  Job.find = () => ({ lean: async () => [] });
  Application.aggregate = async () => {
    aggregateCalled = true;
    return [];
  };

  try {
    const res = fakeRes();
    await recruiterSummary({ userId: "recruiter-empty" }, res);
    assert.deepEqual(res.body, { totalApplicants: 0, shortlisted: 0, selected: 0, recent: [] });
    assert.equal(aggregateCalled, false, "should short-circuit before touching Application at all");
  } finally {
    Job.find = originalJobFind;
    Application.aggregate = originalAggregate;
  }
});
