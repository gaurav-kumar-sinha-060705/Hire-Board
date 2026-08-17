import { Link } from "react-router-dom";

export default function ResetPassword() {
  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Account recovery</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Reset password</h1>
      <p className="page-sub">Password reset is now done with a verification code sent to your email.</p>
      <p className="center-note">
        <Link className="btn" to="/forgot-password">Get a new code</Link>
      </p>
    </div>
  );
}
