import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, UserRound, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

const ROLES = [
  { value: "jobseeker", label: "Job Seeker", hint: "Find & apply to jobs", icon: UserRound },
  { value: "recruiter", label: "Recruiter", hint: "Post jobs & hire", icon: Building2 },
];

function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "jobseeker" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-header">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join JobTrack as a job seeker or a recruiter.</p>
      </div>

      {error && (
        <div className="auth-banner-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <span className="form-label">I am a...</span>
          <div className="role-choice-group">
            {ROLES.map(({ value, label, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={`role-choice ${form.role === value ? "is-selected" : ""}`}
                onClick={() => update("role", value)}
              >
                <Icon size={20} />
                <strong>{label}</strong>
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">
            Full name
          </label>
          <div className="input-with-icon">
            <User size={16} />
            <input
              id="reg-name"
              type="text"
              className="form-input"
              placeholder="Your full name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">
            Email
          </label>
          <div className="input-with-icon">
            <Mail size={16} />
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">
            Password
          </label>
          <div className="input-with-icon">
            <Lock size={16} />
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
            <button
              type="button"
              className="input-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-footer-line">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </>
  );
}

export default Register;
