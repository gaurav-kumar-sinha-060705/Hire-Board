import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

export default function Login() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const user = await login({ email, password });
      if (user.role === "recruiter") {
        try {
          const t = localStorage.getItem("hb_token");
          await api.getMyCompany(t);
          navigate("/my-jobs");
        } catch {
          navigate("/register-company");
        }
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel-narrow">
      <div className="eyebrow">Welcome back</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label htmlFor="password">Password</label>
            <Link className="btn link" to="/forgot-password" style={{ fontSize: 12 }}>Forgot password?</Link>
          </div>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="center-note">
        No account? <Link className="btn link" to="/register">Register here</Link>
      </p>
    </div>
  );
}
