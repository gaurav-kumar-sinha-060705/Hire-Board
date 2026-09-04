import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function VerifyEmail() {
  const { user, refreshUser, refreshCompany } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/browse";
  const [email, setEmail] = useState(user?.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  async function handleSendCode(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setResendLoading(true);
    setResendMsg("");
    setError("");
    try {
      const data = await api.resendOtp({ email });
      setCodeSent(true);
      setResendMsg(data.message || "Code sent.");
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.verifyEmail({ email, otp });
      const updated = await refreshUser();
      let next = redirectTo;
      if (next === "/browse" || next === "/verify-email") {
        if (updated.role === "seeker") {
          if (!updated.profile?.headline || !updated.profile?.skills || updated.profile.skills.length === 0) next = "/profile";
        } else if (updated.role === "recruiter") {
          const c = await refreshCompany();
          if (!c) next = "/register-company";
          else if (!updated.profile?.headline) next = "/profile";
        }
      }
      setSuccess(true);
      setTimeout(() => navigate(next, { replace: true }), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="panel panel-narrow">
        <div className="eyebrow">Verified</div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Email verified</h1>
        <p className="page-sub">Your email has been verified. Redirecting...</p>
      </div>
    );
  }

  if (!codeSent) {
    return (
      <div className="panel panel-narrow">
        <div className="eyebrow">Verify your email</div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Enter your email</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>Type your email address to receive a verification code.</p>
        <form onSubmit={handleSendCode}>
          <div className="field">
            <label htmlFor="verify-email">Email</label>
            <input id="verify-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          {error && <div className="error-text">{error}</div>}
          {resendMsg && <p className="page-sub" style={{ fontSize: 13, color: "var(--gray-500)" }}>{resendMsg}</p>}
          <button className="btn full" type="submit" disabled={resendLoading} style={{ marginTop: 8 }}>
            {resendLoading ? "Sending..." : "Send verification code"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Verify your email</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Check your inbox</h1>
      <p className="page-sub">We sent a 6-digit code to <strong>{email}</strong>. Enter it below.</p>
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
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>
      <p className="center-note" style={{ marginTop: 16 }}>
        <button
          className="btn link"
          onClick={handleSendCode}
          disabled={resendLoading}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-600)", textDecoration: "underline" }}
        >
          {resendLoading ? "Sending..." : "Resend code"}
        </button>
      </p>
      {resendMsg && <p className="center-note" style={{ fontSize: 13, color: "var(--gray-500)" }}>{resendMsg}</p>}
    </div>
  );
}
