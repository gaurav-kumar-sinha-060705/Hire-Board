import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { statusLabel, statusClass } from "../status.js";
import { jobTicketId } from "../utils.js";

export default function MyApplications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.myApplications(token)
      .then((d) => setApps(d.applications))
      .catch(() => setError("Failed to load applications."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  if (error) return (
    <div className="empty-state">
      <h3>Something went wrong</h3>
      <p>{error}</p>
      <p><button className="btn link" onClick={() => { setLoading(true); setError(null); api.myApplications(token).then((d) => setApps(d.applications)).catch(() => setError("Failed to load applications.")).finally(() => setLoading(false)); }}>Try again</button></p>
    </div>
  );

  return (
    <div>
      <div className="eyebrow">Dashboard</div>
      <h1 className="page-title">My applications</h1>
      <p className="page-sub">Track the status of every role you've applied to.</p>

      {apps.length === 0 && (
        <div className="empty-state">
          <h3>No applications yet</h3>
          <p><button className="btn link" onClick={() => navigate("/")}>Browse open jobs</button></p>
        </div>
      )}

      {apps.map((a) => (
        <div className="job" key={a.id}>
          <div className="job-head">
            <div>
              <h2 className="job-title">{a.job ? a.job.title : "Deleted posting"}</h2>
              <div className="job-company">
                {a.job ? (
                  <>
                    {a.job.company?.id ? (
                      <Link className="job-company-link" to={`/company/${a.job.company.id}`}>{a.job.company.name}</Link>
                    ) : (
                      <span>{a.job.company?.name || a.job.company}</span>
                    )}
                    {" · "}{a.job.company?.location || a.job.location}
                  </>
                ) : "This posting is no longer available"}
              </div>
            </div>
            <div className="job-id">{a.job ? jobTicketId(a.job.id) : "—"}</div>
          </div>
          <div className="job-foot">
            <span className="job-meta">Applied {new Date(a.applied_at).toLocaleDateString()}</span>
            <div className="job-actions">
              <span className={statusClass(a.status)}>{statusLabel(a.status)}</span>
              {a.job && (a.status === "shortlisted" || a.status === "accepted") && (
                <button
                  className="btn small outline"
                  onClick={() => navigate(`/messages?job=${a.job.id}&with=${a.job.recruiter_id}`)}
                >Message recruiter</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
