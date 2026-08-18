import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalJobs: 0, totalCompanies: 0, totalUsers: 0 });

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  if (user) return null;

  return (
    <div>
      <section style={{ textAlign: "center", padding: "60px 0 32px" }}>
        <div className="eyebrow">Hire Board</div>
        <h1 style={{ fontSize: 42, lineHeight: 1.15, marginTop: 12, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          Know the company.<br />Before you apply.
        </h1>
        <p style={{ color: "var(--gray-500)", fontSize: 18, marginTop: 16, maxWidth: 500, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          India's culture-first hiring platform. Browse real company profiles, see how teams work, and find the right fit — not just the right salary.
        </p>
        <div style={{ marginTop: 32 }}>
          <Link className="btn" to="/register" style={{ padding: "12px 28px", fontSize: 15 }}>Get started</Link>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 32, padding: "20px 0", borderTop: "1px solid var(--gray-100)", borderBottom: "1px solid var(--gray-100)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display)" }}>{formatNum(stats.totalJobs)}</div>
          <div style={{ fontSize: 12, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>Job Postings</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display)" }}>{formatNum(stats.totalCompanies)}</div>
          <div style={{ fontSize: 12, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>Companies</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display)" }}>{formatNum(stats.totalUsers)}</div>
          <div style={{ fontSize: 12, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>Users</div>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginTop: 48 }}>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>&#127970;</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Company culture profiles</h3>
          <p style={{ color: "var(--gray-500)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            See tech stack, work culture, team size, and growth stage — managed by recruiters, not anonymous reviews.
          </p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>&#128176;</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Free for small businesses</h3>
          <p style={{ color: "var(--gray-500)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            India's 63 million MSMEs can post jobs and hire talent without paying enterprise prices. Zero cost to start.
          </p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>&#127891;</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Campus hiring for all</h3>
          <p style={{ color: "var(--gray-500)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Tier 2 and 3 college students get access to companies that don't visit their campus. Breaking the placement barrier.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 64, padding: "40px 0", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, marginBottom: 12 }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, marginTop: 32, maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--black)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 600, fontSize: 16 }}>1</div>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>Create your profile</h3>
            <p style={{ color: "var(--gray-500)", fontSize: 13, margin: 0 }}>Sign up as a recruiter or job seeker in 30 seconds.</p>
          </div>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--black)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 600, fontSize: 16 }}>2</div>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>Explore companies</h3>
            <p style={{ color: "var(--gray-500)", fontSize: 13, margin: 0 }}>Browse real company profiles with culture, team, and growth data.</p>
          </div>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--black)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 600, fontSize: 16 }}>3</div>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>Apply & connect</h3>
            <p style={{ color: "var(--gray-500)", fontSize: 13, margin: 0 }}>Apply to jobs and message recruiters directly through the platform.</p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 48, padding: "40px", background: "var(--black)", borderRadius: 8, textAlign: "center" }}>
        <h2 style={{ color: "var(--white)", fontSize: 24, marginBottom: 8 }}>Ready to find the right fit?</h2>
        <p style={{ color: "var(--gray-300)", fontSize: 15, marginBottom: 24 }}>Join recruiters and job seekers who hire with transparency.</p>
        <Link className="btn" to="/register" style={{ background: "var(--white)", color: "var(--black)", padding: "12px 28px", fontSize: 15 }}>Create free account</Link>
      </section>
    </div>
  );
}
