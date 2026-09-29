import { useState } from "react";
import { Phone, MapPin, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import "./Settings.css";

function Settings() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    location: user.location || "",
    profilePhoto: user.profilePhoto || "",
  });
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveAccount(e) {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    if (result.ok) toast.success("Settings saved.");
    else toast.error(result.error || "Could not save your settings.");
  }

  async function setTheme(theme) {
    if (theme === user.theme) return;
    const result = await updateProfile({ theme });
    if (!result.ok) toast.error(result.error || "Could not change theme.");
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account details and preferences.</p>
        </div>
      </div>

      <div className="panel panel-padded">
        <h3 className="form-section-title" style={{ marginTop: 0 }}>
          Account
        </h3>
        <div className="settings-readonly-row">
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className="settings-readonly-row">
          <span>Account type</span>
          <span className="role-badge">{user.role}</span>
        </div>

        <form onSubmit={saveAccount} style={{ marginTop: 18 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="s-name">
              Full name
            </label>
            <input id="s-name" type="text" className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="s-phone">
                Phone
              </label>
              <div className="input-with-icon">
                <Phone size={16} />
                <input id="s-phone" type="tel" className="form-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s-location">
                Location
              </label>
              <div className="input-with-icon">
                <MapPin size={16} />
                <input id="s-location" type="text" className="form-input" value={form.location} onChange={(e) => update("location", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="s-photo">
              Profile photo URL
            </label>
            <input id="s-photo" type="url" className="form-input" value={form.profilePhoto} onChange={(e) => update("profilePhoto", e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel panel-padded" style={{ marginTop: 20 }}>
        <h3 className="form-section-title" style={{ marginTop: 0 }}>
          Appearance
        </h3>
        <div className="theme-choice-group">
          <button type="button" className={`theme-choice ${user.theme !== "dark" ? "is-selected" : ""}`} onClick={() => setTheme("light")}>
            <Sun size={16} /> Light
          </button>
          <button type="button" className={`theme-choice ${user.theme === "dark" ? "is-selected" : ""}`} onClick={() => setTheme("dark")}>
            <Moon size={16} /> Dark
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
