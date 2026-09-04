import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    setNote("");
    try {
      const data = await api.forgotPassword({ email });
      setSent(true);
      setNote(data.message || "If an account exists, a reset code has been sent.");
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
        <p className="page-sub">We sent a reset code to <strong>{email}</strong>. Check your inbox, then continue below.</p>
        {!!note && <p className="page-sub" style={{ color: "var(--gray-500)", fontSize: 13 }}>{note}</p>}
        <button className="btn full" style={{ marginTop: 16 }} onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}>
          I have the code — continue
        </button>
        <p className="center-note">
          Didn't get it? <button className="btn link" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-600)", textDecoration: "underline" }} onClick={handleSubmit} disabled={loading}>Resend code</button>
        </p>
        <p className="center-note">
          <Link className="btn link" to="/login">Back to sign in</Link>
        </p>
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
