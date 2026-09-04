import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.forgotPassword({ email });
      setSent(true);
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="panel panel-narrow">
        <div className="eyebrow">Check your inbox</div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Code sent</h1>
        <p className="page-sub">We sent a reset code to <strong>{email}</strong>. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Account recovery</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Forgot password</h1>
      <p className="page-sub" style={{ marginBottom: 24 }}>Enter your email and we'll send you a reset code.</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Sending…" : "Send reset code"}
        </button>
      </form>
      <p className="center-note">
        <Link className="btn link" to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
