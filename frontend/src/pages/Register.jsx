import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "seeker" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError("Fill in your name, email, and a password with at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === "recruiter" ? "/register-company" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Get started</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Create your account</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>I am a</label>
          <div className="radio-group">
            <div
              className={"radio-option" + (form.role === "seeker" ? " selected" : "")}
              onClick={() => update("role", "seeker")}
            >
              Job seeker
            </div>
            <div
              className={"radio-option" + (form.role === "recruiter" ? " selected" : "")}
              onClick={() => update("role", "recruiter")}
            >
              Recruiter
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jordan Lee" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" maxLength={128} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="center-note">
        Already registered? <Link className="btn link" to="/login">Sign in</Link>
      </p>
    </div>
  );
}
