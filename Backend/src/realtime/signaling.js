// WebRTC signaling for interview video calls (Section 12).
//
// This server never sees or relays video/audio itself — it only passes small
// JSON messages (SDP offers/answers, ICE candidates) between the two browsers
// so they can set up a direct peer-to-peer connection. Camera/mic video never
// touches this server.
//
// Authorization happens twice, both server-side: once here (a socket can only
// join a room for an interview it's actually part of) and once again in
// interviewController.getMeetingInfo (the REST call the frontend makes before
// it ever asks for camera/mic access). Neither trusts the client's word for
// which meetingId "belongs" to it.
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { Interview } from "../models/Interview.js";

// meetingId -> Map(userId -> socketId). Used only to tell a joining client
// whether the other participant is already in the room; Socket.IO's own
// rooms (socket.join/to) handle the actual message relaying.
const occupants = new Map();

function removeFromRoom(socket) {
  const { meetingId, userId, role } = socket;
  if (!meetingId) return;
  const room = occupants.get(meetingId);
  if (room) {
    room.delete(userId);
    if (room.size === 0) occupants.delete(meetingId);
  }
  socket.to(meetingId).emit("peer-left", { role });
  socket.leave(meetingId);
  socket.meetingId = null;
}

export function attachSignaling(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: config.clientOrigins, credentials: true },
  });

  // The handshake carries the same JWT as every REST call (socket.handshake.auth.token),
  // verified the same way requireAuth verifies it — a socket with no valid token never connects.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("missing token");
      const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
      socket.userId = payload.sub;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error("Authentication required."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-meeting", async ({ meetingId } = {}, ack) => {
      try {
        if (typeof ack !== "function") return;
        if (!meetingId || typeof meetingId !== "string") {
          return ack({ ok: false, message: "A meeting id is required." });
        }

        const interview = await Interview.findOne({ meetingId });
        if (!interview) return ack({ ok: false, message: "This meeting could not be found." });
        if (interview.status === "Cancelled") {
          return ack({ ok: false, message: "This interview has been cancelled." });
        }

        const isCandidate = interview.candidate.toString() === socket.userId;
        const isRecruiter = interview.recruiter.toString() === socket.userId;
        if (!isCandidate && !isRecruiter) {
          return ack({ ok: false, message: "You're not part of this interview." });
        }

        socket.meetingId = meetingId;
        socket.role = isCandidate ? "candidate" : "recruiter";
        socket.join(meetingId);

        let room = occupants.get(meetingId);
        if (!room) {
          room = new Map();
          occupants.set(meetingId, room);
        }
        const peerPresent = [...room.keys()].some((uid) => uid !== socket.userId);
        room.set(socket.userId, socket.id);

        ack({ ok: true, role: socket.role, peerPresent });
        socket.to(meetingId).emit("peer-joined", { role: socket.role });
      } catch {
        ack?.({ ok: false, message: "Could not join the meeting. Please try again." });
      }
    });

    // Relayed verbatim to the other participant: { type: "offer"|"answer"|"ice-candidate", ... }
    socket.on("signal", (payload) => {
      if (!socket.meetingId) return;
      socket.to(socket.meetingId).emit("signal", payload);
    });

    socket.on("chat-message", (payload = {}) => {
      if (!socket.meetingId) return;
      const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 1000) : "";
      if (!text) return;
      socket.to(socket.meetingId).emit("chat-message", {
        id: `${socket.id}-${Date.now()}`,
        text,
        senderId: socket.userId,
        senderName: typeof payload.senderName === "string" ? payload.senderName.slice(0, 100) : "Participant",
        sentAt: new Date().toISOString(),
      });
    });

    socket.on("leave-meeting", () => removeFromRoom(socket));
    socket.on("disconnect", () => removeFromRoom(socket));
  });

  return io;
}
