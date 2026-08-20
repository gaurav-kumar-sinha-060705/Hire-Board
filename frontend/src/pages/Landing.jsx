import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  if (display >= 1000) {
    const k = display / 1000;
    return <>{k % 1 === 0 ? k + "k" : k.toFixed(1).replace(/\.0$/, "") + "k"}</>;
  }
  return <>{display}</>;
}

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalJobs: 0, totalCompanies: 0, totalUsers: 0 });

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  if (user) return null;

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <div className="eyebrow">Hire Board</div>
        <h1 className="landing-title">
          Know the company.<br />Before you apply.
        </h1>
        <p className="landing-sub">
          India's culture-first hiring platform. Browse real company profiles, see how teams work, and find the right fit — not just the right salary.
        </p>
        <div className="landing-cta">
          <Link className="btn" to="/register">Get started free</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="landing-stats">
        <div className="landing-stat">
          <div className="landing-stat-num"><AnimatedNumber value={stats.totalJobs} /></div>
          <div className="landing-stat-label">Open roles</div>
        </div>
        <div className="landing-stat-divider" />
        <div className="landing-stat">
          <div className="landing-stat-num"><AnimatedNumber value={stats.totalCompanies} /></div>
          <div className="landing-stat-label">Companies</div>
        </div>
        <div className="landing-stat-divider" />
        <div className="landing-stat">
          <div className="landing-stat-num"><AnimatedNumber value={stats.totalUsers} /></div>
          <div className="landing-stat-label">Users</div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature-card">
          <div className="landing-feature-icon">&#127970;</div>
          <h3>Company culture profiles</h3>
          <p>See tech stack, work culture, team size, and growth stage — managed by recruiters, not anonymous reviews.</p>
        </div>
        <div className="landing-feature-card">
          <div className="landing-feature-icon">&#128176;</div>
          <h3>Free for small businesses</h3>
          <p>India's 63 million MSMEs can post jobs and hire talent without paying enterprise prices. Zero cost to start.</p>
        </div>
        <div className="landing-feature-card">
          <div className="landing-feature-icon">&#127891;</div>
          <h3>Campus hiring for all</h3>
          <p>Tier 2 and 3 college students get access to companies that don't visit their campus. Breaking the placement barrier.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h3>Create your profile</h3>
            <p>Sign up as a recruiter or job seeker in 30 seconds.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h3>Explore companies</h3>
            <p>Browse real company profiles with culture, team, and growth data.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h3>Apply &amp; connect</h3>
            <p>Apply to jobs and message recruiters directly through the platform.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-block">
        <h2>Ready to find the right fit?</h2>
        <p>Join recruiters and job seekers who hire with transparency.</p>
        <Link className="btn landing-cta-btn" to="/register">Create free account</Link>
      </section>
    </div>
  );
}
