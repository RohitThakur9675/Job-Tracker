import { useEffect, useRef, useState } from "react";
import { Building2, Globe, Mail, MapPin, Phone, Upload, UserRound, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../utils/api";
import { Link } from "react-router-dom";

const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function RecruiterProfile() {
  const { user, setFullUser } = useAuth();
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    api.getMyCompany().then(setCompany).catch((err) => {
      if (err.status !== 404) toast.error(err.message || "Could not load company profile.");
    }).finally(() => setLoading(false));
  }, []);

  const initials = (user?.name || "U").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!PHOTO_MIME_TYPES.includes(file.type)) return toast.error("Profile photo must be JPG, PNG, or WEBP.");
    if (file.size > PHOTO_MAX_BYTES) return toast.error("Photo must be under 3 MB.");

    setPhotoUploading(true);
    try {
      const { user: updated } = await api.uploadPhoto(file);
      setFullUser(updated);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err.message || "Could not upload your photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function removePhoto() {
    setPhotoUploading(true);
    try {
      const { user: updated } = await api.deletePhoto();
      setFullUser(updated);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove your photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div><h1 className="page-title">My Profile</h1><p className="page-subtitle">Your recruiter details and company information.</p></div>
        <Link to="/recruiter/company" className="btn-secondary">Edit company profile</Link>
      </div>

      <section className="panel panel-padded" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="table-avatar" style={{ width: 72, height: 72, fontSize: 22, overflow: "hidden" }}>
            {user?.profilePhoto ? <img src={user.profilePhoto} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 className="section-title" style={{ marginBottom: 6 }}><UserRound size={18} /> {user?.name}</h2>
            <p className="table-cell-muted">Recruiter</p>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} />
            <div className="form-actions" style={{ marginTop: 10 }}>
              <button type="button" className="btn-secondary btn-sm" disabled={photoUploading} onClick={() => photoInputRef.current?.click()}>
                <Upload size={14} /> {photoUploading ? "Uploading..." : user?.profilePhoto ? "Replace photo" : "Upload photo"}
              </button>
              {user?.profilePhoto && <button type="button" className="btn-danger btn-sm" disabled={photoUploading} onClick={removePhoto}><X size={14} /> Remove</button>}
            </div>
          </div>
        </div>
        <div className="list-stack" style={{ marginTop: 18 }}>
          <p><Mail size={14} /> {user?.email}</p>
          {user?.phone && <p><Phone size={14} /> {user.phone}</p>}
          {user?.location && <p><MapPin size={14} /> {user.location}</p>}
        </div>
      </section>

      <section className="panel panel-padded">
        {loading ? <div className="loading-block"><span className="loading-spinner-sm" /> Loading company...</div> : company ? (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {company.logo ? <img src={company.logo} alt={company.name} style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 12 }} /> : <Building2 size={28} />}
              <div><h2 className="section-title">{company.name}</h2><p className="table-cell-muted">{company.industry || "Company"}</p></div>
            </div>
            {company.description && <p style={{ marginTop: 16, lineHeight: 1.6 }}>{company.about}</p>}
            <div className="list-stack" style={{ marginTop: 16 }}>
              {company.location && <p><MapPin size={14} /> {company.location}</p>}
              {company.website && <p><Globe size={14} /> <a href={company.website} target="_blank" rel="noreferrer">{company.website}</a></p>}
            </div>
          </>
        ) : (
          <div><p className="section-title">No company profile yet</p><Link to="/recruiter/company" className="btn-primary" style={{ marginTop: 12 }}>Create company profile</Link></div>
        )}
      </section>
    </div>
  );
}

export default RecruiterProfile;
