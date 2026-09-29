import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";

// A minimal smoke test that doesn't need a live MongoDB connection — it just
// proves the Express app boots and answers requests. Add real endpoint tests
// here as each phase's routes get exercised (see PHASE_PROGRESS.md at the repo
// root for what's built so far).
test("GET /api/health responds with status ok", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, "ok");
    assert.ok(body.database === "connected" || body.database === "disconnected");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/unknown-route returns 404", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/unknown-route`);
    assert.equal(res.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
