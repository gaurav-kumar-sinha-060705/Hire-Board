import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { statusLabel, statusClass } from "../status.js";


export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const showToast = useToast();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getCompany(id), api.listJobs("", Number(id)), api.getCompanyTeam(id)])
      .then(([compData, jobData, teamData]) => {
        setCompany(compData.company);
        setJobs(jobData.jobs);
        setTeam(teamData.team || []);
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = user?.role === "recruiter" && company && user.id === company.recruiter_id;

  async function handleRemoveMember(seekerId) {
    setRemovingId(seekerId);
    try {
      await api.removeTeamMember(id, seekerId, token);
      setTeam((prev) => prev.filter((m) => m.id !== seekerId));
      showToast("Removed from team.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setRemovingId(null);
    }
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {company.logo && (
              <img src={company.logo} alt={company.name} className="logo-lg" />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 className="page-title" style={{ fontSize: 26, margin: 0 }}>{company.name}</h1>
              {company.registered
                ? <span className="registered-badge">Registered</span>
                : <span className="registered-badge" style={{ background: "var(--gray-300)", color: "var(--gray-600)" }}>Unregistered</span>
              }
            </div>
          </div>
          <div className="job-company" style={{ marginTop: 4, marginLeft: company.logo ? 78 : 0 }}>
            {company.location} · {company.type}{company.size ? ` · ${company.size} employees` : ""}{company.founded_year && ` · Founded ${company.founded_year}`}
          </div>
          {company.social_links && (
            <div className="job-tags" style={{ marginTop: 8 }}>
              {Object.entries(company.social_links).filter(([,v]) => v).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer" className="tag">{key.charAt(0).toUpperCase() + key.slice(1)}</a>
              ))}
            </div>
          )}
        </div>
        {user?.role === "recruiter" && user.id === company.recruiter_id && (
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

      {company.tech_stack?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="profile-label">Tech Stack</div>
          <div className="job-tags">
            {company.tech_stack.map((t) => <span className="tag" key={t}>{t}</span>)}
          </div>
        </div>
      )}

      {company.benefits?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="profile-label">Benefits & Perks</div>
          <div className="job-tags">
            {company.benefits.map((b) => <span className="tag" key={b}>{b}</span>)}
          </div>
        </div>
      )}

      {company.culture && (
        <div className="job-detail-section" style={{ marginTop: 16 }}>
          <div className="profile-label">Culture & Values</div>
          <p className="job-desc">{company.culture}</p>
        </div>
      )}

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
              </div>
              <div className="job-tags">
                <span className="tag dark">{job.type}</span>
                <span className="tag">{job.mode}</span>
                {job.salary_min || job.salary_max ? (
                  <span className="tag dark">
                    {job.salary_currency || "INR"} {job.salary_min ? `${Number(job.salary_min).toLocaleString()}` : ""}
                    {job.salary_min && job.salary_max ? " – " : ""}
                    {job.salary_max ? `${Number(job.salary_max).toLocaleString()}` : ""}
                  </span>
                ) : job.salary ? (
                  <span className="tag dark">{job.salary}</span>
                ) : null}
              </div>
              <div className="job-foot">
                <span className="job-meta">Posted {new Date(job.posted_at).toLocaleDateString()}</span>
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

      {team.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="profile-label">Team on Board ({team.length})</div>
          {team.map((member) => (
            <div className="company-info-block" key={member.id} style={{ marginBottom: 12 }}>
              <div className="company-info-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="avatar-sm" />
                  ) : (
                    <div className="avatar-sm avatar-fallback">{member.name?.charAt(0)?.toUpperCase() || "?"}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</div>
                  {member.headline && <div style={{ fontSize: 13, color: "var(--gray-700)" }}>{member.headline}</div>}
                  {member.location && <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{member.location}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={statusClass(member.status)}>{statusLabel(member.status)}</span>
                  {isOwner && member.status === "accepted" && (
                    <button
                      className="btn small outline danger"
                      disabled={removingId === member.id}
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      {removingId === member.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
                </div>
              </div>
              {member.skills?.length > 0 && (
                <div className="job-tags" style={{ marginTop: 8 }}>
                  {member.skills.map((s) => <span className="tag" key={s}>{s}</span>)}
                </div>
              )}
              {member.jobTitle && <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 8 }}>For: {member.jobTitle}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
