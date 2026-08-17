import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function ForgotPassword() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  const [resendMsg, setResendMsg] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.forgotPassword(email);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.resetPassword({ email, otp, password });
      setSuccess(true);
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
      const data = await api.resendOtp({ email, purpose: "reset" });
      setResendMsg(data.message || "Code sent.");
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setResendMsg(`Dev OTP: ${data.devOtp}`);
      }
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  }

  if (success) {
    return (
      <div className="panel panel-narrow">
        <div className="eyebrow">Done</div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Password reset</h1>
        <p className="page-sub">Your password has been updated. You can now sign in with your new password.</p>
        <p className="center-note">
          <Link className="btn" to="/login">Sign in</Link>
        </p>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="panel panel-narrow">
        <div className="eyebrow">Account recovery</div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Reset password</h1>
        <p className="page-sub">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
        {devOtp && (
          <div style={{ background: "var(--gray-100)", borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13 }}>
            <strong>Dev mode OTP:</strong> {devOtp}
          </div>
        )}
        {resendMsg && <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 12 }}>{resendMsg}</p>}
        <form onSubmit={handleReset}>
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
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" maxLength={128} />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" maxLength={128} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
        <p className="center-note" style={{ marginTop: 16 }}>
          <button className="btn link" onClick={handleResend} disabled={resendLoading} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-600)", textDecoration: "underline" }}>
            {resendLoading ? "Sending…" : "Resend code"}
          </button>
        </p>
        <p className="center-note" style={{ marginTop: 8 }}>
          <Link className="btn link" to="/login">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Account recovery</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Forgot password</h1>
      <p className="page-sub">Enter your email and we'll send you a verification code.</p>
      <form onSubmit={handleSendOtp}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" maxLength={200} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Sending…" : "Send code"}
        </button>
      </form>
      <p className="center-note">
        <Link className="btn link" to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
