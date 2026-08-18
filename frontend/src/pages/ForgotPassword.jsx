import { Link } from "react-router-dom";

export default function ForgotPassword() {
  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Account recovery</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Forgot password</h1>
      <div className="page-sub" style={{ marginBottom: 24 }}>
        <p>Having trouble signing in? We're here to help.</p>
        <p style={{ marginTop: 12 }}>
          Email us at <a href="mailto:gaurav060705@gmail.com" style={{ color: "var(--black)", fontWeight: 600 }}>gaurav060705@gmail.com</a> with your registered email address and describe your issue.
        </p>
        <p style={{ marginTop: 12, color: "var(--gray-500)" }}>
          We'll reply with a solution within <strong>7 days</strong>.
        </p>
      </div>
      <p className="center-note">
        <Link className="btn" to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
