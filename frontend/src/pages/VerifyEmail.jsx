import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function VerifyEmail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.verifyEmail({ email: user.email, otp });
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendMsg("");
    try {
      const data = await api.resendOtp({ email: user.email, purpose: "verify" });
      setResendMsg(data.message || "Code sent.");
      if (data.devOtp) setResendMsg(`Dev OTP: ${data.devOtp}`);
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  }

  if (success) {
    return (
      <div className="panel panel-narrow">
        <div className="eyebrow">Verified</div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Email verified</h1>
        <p className="page-sub">Your email has been verified. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Verify your email</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Check your inbox</h1>
      <p className="page-sub">We sent a 6-digit code to <strong>{user?.email}</strong>. Enter it below.</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="otp">Verification code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            style={{ letterSpacing: 6, textAlign: "center", fontSize: 20, fontWeight: 600 }}
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Verifying…" : "Verify email"}
        </button>
      </form>
      <p className="center-note" style={{ marginTop: 16 }}>
        <button className="btn link" onClick={handleResend} disabled={resendLoading} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-600)", textDecoration: "underline" }}>
          {resendLoading ? "Sending…" : "Resend code"}
        </button>
      </p>
      {resendMsg && <p className="center-note" style={{ fontSize: 13, color: "var(--gray-500)" }}>{resendMsg}</p>}
      <p className="center-note">
        <Link className="btn link" to="/">Skip for now</Link>
      </p>
    </div>
  );
}
