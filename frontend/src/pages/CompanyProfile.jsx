import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { jobTicketId } from "../utils.js";

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getCompany(id), api.listJobs("", Number(id))])
      .then(([compData, jobData]) => {
        setCompany(compData.company);
        setJobs(jobData.jobs);
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  if (!company) {
    return (
      <div className="empty-state">
        <h3>Company not found</h3>
        <p><button className="btn link" onClick={() => navigate("/")}>Back to browse</button></p>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow"><button className="btn link" onClick={() => navigate(-1)}>← Back</button></div>

      <div className="company-header" style={{ marginTop: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 26 }}>{company.name}</h1>
          <div className="job-company" style={{ marginTop: 4 }}>{company.location} · {company.type}{company.size ? ` · ${company.size} employees` : ""}</div>
        </div>
        {user?.role === "recruiter" && user.id === company.recruiterId && (
          <div>
            <Link className="btn small outline" to="/edit-company">Edit company</Link>
          </div>
        )}
      </div>

      <div className="job-tags">
        <span className="tag dark">{company.type}</span>
        {company.size && <span className="tag">{company.size}</span>}
        {company.website && (
          <span className="tag">
            <a href={/^[a-z][a-z0-9+.-]*:\/\//i.test(company.website) ? company.website : "https://" + company.website} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              Website
            </a>
          </span>
        )}
      </div>

      <div className="job-detail-section">
        <div className="profile-label">About</div>
        <p className="job-desc">{company.description}</p>
      </div>

      {jobs.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="profile-label">Open positions ({jobs.length})</div>
          {jobs.map((job) => (
            <div className="job" key={job.id}>
              <div className="job-head">
                <div>
                  <h2 className="job-title">
                    <Link className="job-title-link" to={`/jobs/${job.id}`}>{job.title}</Link>
                  </h2>
                  <div className="job-company">{job.location}</div>
                </div>
                <div className="job-id">{jobTicketId(job.id)}</div>
              </div>
              <div className="job-tags">
                <span className="tag dark">{job.type}</span>
                <span className="tag">{job.mode}</span>
                {job.salary && <span className="tag">{job.salary}</span>}
              </div>
              <div className="job-foot">
                <span className="job-meta">Posted {new Date(job.postedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <h3>No open positions</h3>
          <p>This company hasn't posted any jobs yet.</p>
        </div>
      )}
    </div>
  );
}
