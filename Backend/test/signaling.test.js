import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { io as ioClient } from "socket.io-client";
import { attachSignaling } from "../src/realtime/signaling.js";
import { signToken } from "../src/middleware/auth.js";
import { Interview } from "../src/models/Interview.js";

// No live MongoDB in this environment, so Interview.findOne is stubbed for the
// duration of this test — everything else here (JWT auth on the socket
// handshake, room membership, authorization, and signal relaying) is the real
// signaling.js code from src/realtime/signaling.js, unmocked.
const MEETING_ID = "meeting-test-123";
const CANDIDATE_ID = "cand1";
const RECRUITER_ID = "recruiter1";
const STRANGER_ID = "stranger1";

const FAKE_INTERVIEW = {
  meetingId: MEETING_ID,
  candidate: CANDIDATE_ID,
  recruiter: RECRUITER_ID,
  status: "Scheduled",
};

function once(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args.length > 1 ? args : args[0]);
    });
  });
}

function emitAck(socket, event, payload, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ack on "${event}"`)), timeoutMs);
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

test("WebRTC signaling: join, relay, and leave", async (t) => {
  const originalFindOne = Interview.findOne;
  Interview.findOne = async (query) => (query?.meetingId === MEETING_ID ? { ...FAKE_INTERVIEW } : null);

  const httpServer = http.createServer();
  const io = attachSignaling(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address();
  const url = `http://127.0.0.1:${port}`;

  const candidateToken = signToken(CANDIDATE_ID, "jobseeker");
  const recruiterToken = signToken(RECRUITER_ID, "recruiter");
  const strangerToken = signToken(STRANGER_ID, "jobseeker");

  const sockets = [];
  function connectAs(token) {
    const s = ioClient(url, { path: "/socket.io", auth: { token }, transports: ["websocket"], forceNew: true });
    sockets.push(s);
    return s;
  }

  try {
    await t.test("rejects a connection with no token", async () => {
      const s = ioClient(url, { path: "/socket.io", transports: ["websocket"], forceNew: true });
      sockets.push(s);
      const err = await once(s, "connect_error");
      assert.match(err.message, /Authentication required/);
    });

    const candidate = connectAs(candidateToken);
    await once(candidate, "connect");

    // First to join: nobody else there yet.
    const joinAck1 = await emitAck(candidate, "join-meeting", { meetingId: MEETING_ID });
    assert.equal(joinAck1.ok, true);
    assert.equal(joinAck1.role, "candidate");
    assert.equal(joinAck1.peerPresent, false);

    await t.test("a user not on this interview is refused", async () => {
      const stranger = connectAs(strangerToken);
      await once(stranger, "connect");
      const ack = await emitAck(stranger, "join-meeting", { meetingId: MEETING_ID });
      assert.equal(ack.ok, false);
      assert.match(ack.message, /not part of this interview/);
    });

    const recruiter = connectAs(recruiterToken);
    await once(recruiter, "connect");

    const peerJoinedPromise = once(candidate, "peer-joined");
    const joinAck2 = await emitAck(recruiter, "join-meeting", { meetingId: MEETING_ID });
    assert.equal(joinAck2.ok, true);
    assert.equal(joinAck2.role, "recruiter");
    // The second joiner is told the first is already there — this is exactly what
    // the frontend uses to decide who creates the WebRTC offer (see Meeting.jsx).
    assert.equal(joinAck2.peerPresent, true);

    const peerJoined = await peerJoinedPromise;
    assert.equal(peerJoined.role, "recruiter");

    // Signal relay: a fake SDP offer/answer, exactly as the browser's RTCPeerConnection would emit.
    const fakeOffer = { type: "offer", offer: { type: "offer", sdp: "v=0 fake-sdp" } };
    const relayedOfferPromise = once(recruiter, "signal");
    candidate.emit("signal", fakeOffer);
    const relayedOffer = await relayedOfferPromise;
    assert.deepEqual(relayedOffer, fakeOffer);

    const fakeAnswer = { type: "answer", answer: { type: "answer", sdp: "v=0 fake-answer" } };
    const relayedAnswerPromise = once(candidate, "signal");
    recruiter.emit("signal", fakeAnswer);
    const relayedAnswer = await relayedAnswerPromise;
    assert.deepEqual(relayedAnswer, fakeAnswer);

    // Leaving notifies the other participant so the UI can drop back to "waiting".
    const peerLeftPromise = once(candidate, "peer-left");
    recruiter.emit("leave-meeting");
    const peerLeft = await peerLeftPromise;
    assert.equal(peerLeft.role, "recruiter");
  } finally {
    for (const s of sockets) s.disconnect();
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
    Interview.findOne = originalFindOne;
  }
});
