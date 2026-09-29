import { useState } from "react";
import { X, Code2, GitBranch, Sparkles } from "lucide-react";
import "./CreatorBadge.css";

const CREATOR_NAME = "Rohit Thakur";
const CREATOR_PHOTO_SRC = "/creator-rohit.jpg";

function CreatorBadge({ className = "" }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`creator-badge ${className}`}
        title="About the developer"
        onClick={() => setOpen(true)}
      >
        {photoFailed ? (
          <span className="creator-badge-fallback" aria-hidden="true">R</span>
        ) : (
          <img className="creator-badge-photo" src={CREATOR_PHOTO_SRC} alt="Rohit Thakur" onError={() => setPhotoFailed(true)} />
        )}
        <span className="creator-badge-name">Rohit</span>
      </button>

      {open && (
        <div className="creator-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="creator-modal" role="dialog" aria-modal="true" aria-labelledby="creator-title" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="creator-modal-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="creator-modal-avatar">
              {photoFailed ? <span>R</span> : <img src={CREATOR_PHOTO_SRC} alt="Rohit Thakur" onError={() => setPhotoFailed(true)} />}
            </div>
            <p className="creator-modal-kicker"><Sparkles size={14} /> Developer</p>
            <h2 id="creator-title">Rohit Thakur</h2>
            <p className="creator-modal-role">Creator & developer of JobTrack</p>
            <p className="creator-modal-copy">
              JobTrack is a full-stack recruitment platform project covering job discovery, applications,
              recruiter workflows, interviews and in-app meetings.
            </p>
            <div className="creator-tech-row">
              <span><Code2 size={14} /> React</span><span>Node.js</span><span>MongoDB</span><span>WebRTC</span>
            </div>
            <div className="creator-modal-note">Developed by Rohit Thakur · JobTrack</div>
          </section>
        </div>
      )}
    </>
  );
}

export default CreatorBadge;
