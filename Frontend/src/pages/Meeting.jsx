import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, MonitorUp, MessageCircle, Send, Volume2, VolumeX, X } from "lucide-react";
import { api, tokenStore, SOCKET_URL } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatTime } from "../utils/formatDate";
import EmptyState from "../components/EmptyState";
import "./Meeting.css";

// STUN handles common home/mobile networks. For strict/symmetric NATs, add a TURN
// server through VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL.
function getIceServers() {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turn = import.meta.env.VITE_TURN_URL;
  const user = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turn && user && credential) servers.push({ urls: turn, username: user, credential });
  return servers;
}

function ConnectionBadge({ state }) {
  const label = { connecting: "Connecting…", connected: "Connected", reconnecting: "Reconnecting…", failed: "Connection problem" }[state] || state;
  return <span className={`meeting-status-badge meeting-status-${state}`}>{label}</span>;
}

function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [info, setInfo] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [rtcState, setRtcState] = useState("connecting");
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [mediaMode, setMediaMode] = useState("video");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const makingOfferRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const chatEndRef = useRef(null);

  const leave = useCallback((navigateAway) => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    if (socketRef.current) {
      socketRef.current.emit("leave-meeting");
      socketRef.current.disconnect();
    }
    if (navigateAway) navigate(user?.role === "recruiter" ? "/recruiter/interviews" : "/interviews");
  }, [navigate, user?.role]);

  useEffect(() => {
    let cancelled = false;
    cleanedUpRef.current = false;

    async function start() {
      try {
        const meetingInfo = await api.getMeetingInfo(meetingId);
        if (cancelled) return;
        setInfo(meetingInfo);

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setCamOn(false);
            setMediaMode("audio");
          } catch {
            if (!cancelled) setPhase("media-error");
            return;
          }
        }
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({ iceServers: getIceServers(), iceCandidatePoolSize: 10 });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const remote = event.streams?.[0];
          if (remoteVideoRef.current && remote) {
            remoteVideoRef.current.srcObject = remote;
            remoteVideoRef.current.muted = !speakerOn;
            remoteVideoRef.current.play?.().catch(() => {});
          }
          setPhase("connected");
          setRtcState("connected");
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) socketRef.current?.emit("signal", { type: "ice-candidate", candidate: event.candidate });
        };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === "connected") { setRtcState("connected"); setPhase("connected"); }
          else if (state === "failed") setRtcState("failed");
          else if (state === "disconnected") setRtcState("reconnecting");
          else if (state === "connecting") setRtcState("connecting");
        };

        const socket = io(SOCKET_URL, {
          path: "/socket.io",
          auth: { token: tokenStore.get() },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 8,
          timeout: 10000,
        });
        socketRef.current = socket;

        const flushCandidates = async () => {
          const pending = pendingCandidatesRef.current.splice(0);
          for (const candidate of pending) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn("ICE candidate ignored", e); }
          }
        };

        const createOffer = async () => {
          if (makingOfferRef.current || pc.signalingState !== "stable") return;
          makingOfferRef.current = true;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("signal", { type: "offer", offer: pc.localDescription });
          } catch (e) {
            console.error("Offer creation failed", e);
          } finally { makingOfferRef.current = false; }
        };

        socket.on("connect_error", (err) => {
          if (!cancelled) {
            setErrorMessage(err?.message || "Could not connect to the meeting server.");
            setPhase("error");
          }
        });
        socket.on("reconnect", () => setRtcState("connecting"));
        socket.on("signal", async (payload) => {
          if (!payload || cancelled) return;
          try {
            if (payload.type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              await flushCandidates();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("signal", { type: "answer", answer: pc.localDescription });
            } else if (payload.type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              await flushCandidates();
            } else if (payload.type === "ice-candidate" && payload.candidate) {
              if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              else pendingCandidatesRef.current.push(payload.candidate);
            }
          } catch (err) { console.error("Signaling error:", err); setRtcState("failed"); }
        });
        socket.on("peer-joined", () => { setPhase("connecting"); setRtcState("connecting"); });
        socket.on("peer-left", () => {
          setPhase("waiting"); setRtcState("connecting");
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });
        socket.on("chat-message", (msg) => setMessages((prev) => [...prev, { ...msg, mine: false }]));

        socket.on("connect", () => {
          socket.emit("join-meeting", { meetingId }, (ack) => {
            if (cancelled) return;
            if (!ack?.ok) { setErrorMessage(ack?.message || "Could not join the meeting."); setPhase("error"); return; }
            if (ack.peerPresent) { setPhase("connecting"); createOffer(); }
            else setPhase("waiting");
          });
        });
      } catch (err) {
        if (!cancelled) { setErrorMessage(err.message || "This meeting could not be found."); setPhase("error"); }
      }
    }
    start();
    return () => { cancelled = true; leave(false); };
  }, [meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatOpen]);

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    setMediaMode(track.enabled ? "video" : "audio");
  }

  function toggleSpeaker() {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setSpeakerOn(!video.muted);
  }

  async function stopScreenShare() {
    const pc = pcRef.current;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    try {
      if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
    } catch (err) {
      console.error("Could not restore camera after screen sharing", err);
    }
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setSharing(false);
    setCamOn(cameraTrack?.enabled ?? false);
  }

  async function toggleScreenShare() {
    if (sharing) {
      await stopScreenShare();
      return;
    }
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screen.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) { screenTrack.stop(); return; }
      await sender.replaceTrack(screenTrack);
      screenStreamRef.current = screen;
      if (localVideoRef.current) localVideoRef.current.srcObject = screen;
      setSharing(true);
      screenTrack.onended = () => { stopScreenShare(); };
    } catch (err) {
      if (err?.name !== "AbortError" && err?.name !== "NotAllowedError") console.error("Screen share failed", err);
    }
  }

  function sendMessage(e) {
    e?.preventDefault();
    const text = message.trim();
    if (!text || !socketRef.current?.connected) return;
    const msg = { id: `mine-${Date.now()}`, text, senderName: user?.name || "You", sentAt: new Date().toISOString(), mine: true };
    setMessages((prev) => [...prev, msg]);
    socketRef.current.emit("chat-message", { text, senderName: user?.name || "You" });
    setMessage("");
  }

  if (phase === "loading") return <div className="meeting-shell meeting-center"><Loader2 size={22} className="meeting-spin" /><p>Loading meeting…</p></div>;
  if (phase === "error") return <div className="meeting-shell meeting-center"><EmptyState title="Meeting unavailable" message={errorMessage} action={<Link to={user?.role === "recruiter" ? "/recruiter/interviews" : "/interviews"} className="btn-primary">Back to interviews</Link>} /></div>;
  if (phase === "media-error") return <div className="meeting-shell meeting-center"><EmptyState icon={VideoOff} title="Camera or microphone blocked" message="Allow camera and microphone access in the browser, then try again." action={<button type="button" className="btn-primary" onClick={() => window.location.reload()}>Try again</button>} /></div>;

  const waiting = phase === "waiting";
  const otherName = info?.otherPartyName || "the other participant";
  return (
    <div className="meeting-shell">
      <div className="meeting-header">
        <div><p className="meeting-title">{info?.jobTitle || "Interview"}</p><p className="meeting-subtitle">{formatDate(info?.interviewDate)} · {formatTime(info?.interviewTime)} · {mediaMode === "audio" ? "Audio call" : "Video call"}</p></div>
        {!waiting && <ConnectionBadge state={rtcState} />}
      </div>
      <div className="meeting-stage">
        {waiting ? <div className="meeting-waiting"><Loader2 size={20} className="meeting-spin" /><p>Waiting for {otherName}…</p><small>Keep this page open. The other participant can join from their interview link.</small></div> : <video ref={remoteVideoRef} className="meeting-remote-video" autoPlay playsInline />}
        {!waiting && <div className="meeting-audio-label"><Volume2 size={15} /> Live call</div>}
        <div className="meeting-local-pip">
          <video ref={localVideoRef} className={`meeting-local-video ${!camOn || sharing ? "is-hidden-video" : ""}`} autoPlay playsInline muted />
          {(!camOn && !sharing) && <div className="meeting-local-camoff"><Volume2 size={22} /><span>Audio only</span></div>}
          {sharing && <div className="meeting-share-label"><MonitorUp size={13}/> Sharing screen</div>}
          <span className="meeting-local-label">You</span>
        </div>
      </div>
      <div className="meeting-bottom">
        <div className="meeting-controls">
          <button type="button" className={`meeting-control-btn ${!micOn ? "is-off" : ""}`} onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>{micOn ? <Mic size={18}/> : <MicOff size={18}/>}</button>
          <button type="button" className={`meeting-control-btn ${!camOn ? "is-off" : ""}`} onClick={toggleCam} title={camOn ? "Turn camera off (audio call)" : "Turn camera on"}>{camOn ? <Video size={18}/> : <VideoOff size={18}/>}</button>
          <button type="button" className={`meeting-control-btn ${sharing ? "is-share-on" : ""}`} onClick={toggleScreenShare} title={sharing ? "Stop screen sharing" : "Share screen"}><MonitorUp size={18}/></button>
          <button type="button" className="meeting-control-btn" onClick={toggleSpeaker} title={speakerOn ? "Mute speaker" : "Unmute speaker"}>{speakerOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
          <button type="button" className={`meeting-control-btn ${chatOpen ? "is-share-on" : ""}`} onClick={() => setChatOpen((v) => !v)} title="Open chat"><MessageCircle size={18}/></button>
          <button type="button" className="meeting-control-btn meeting-leave-btn" onClick={() => leave(true)} title="Leave call"><PhoneOff size={18}/></button>
        </div>
        {chatOpen && <aside className="meeting-chat">
          <div className="meeting-chat-header"><strong>Interview chat</strong><button type="button" onClick={() => setChatOpen(false)}><X size={16}/></button></div>
          <div className="meeting-chat-messages">
            {messages.length === 0 && <div className="meeting-chat-empty">Send a message to {otherName}.</div>}
            {messages.map((msg) => <div key={msg.id} className={`meeting-chat-message ${msg.mine ? "mine" : ""}`}><span>{msg.text}</span><small>{msg.mine ? "You" : msg.senderName || otherName}</small></div>)}
            <div ref={chatEndRef}/>
          </div>
          <form className="meeting-chat-form" onSubmit={sendMessage}><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="Type a message…" autoComplete="off"/><button type="submit" disabled={!message.trim()}><Send size={16}/></button></form>
        </aside>}
      </div>
    </div>
  );
}

export default MeetingRoom;
