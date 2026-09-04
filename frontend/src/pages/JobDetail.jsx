import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ApplyModal from "../components/ApplyModal.jsx";
import { statusLabel, statusClass } from "../status.js";
import { canApply, submitApplication as submitApplicationFn } from "../applyGuard.js";


export default function JobDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [job, setJob] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    setLoading(true);
    api.getJob(id).then((d) => {
      setJob(d.job);
      if (d.job.company?.id) {
        api.getCompanyTeam(d.job.company.id).then((td) => setTeam(td.team || [])).catch(() => {});
      }
    }).catch(() => setJob(null)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === "seeker" && token) {
      api.myApplications(token).then((d) => {
        const app = d.applications.find((a) => a.job_id === Number(id));
        setStatus(app ? app.status : null);
      }).catch(() => {});
    } else {
      setStatus(null);
    }
  }, [user, token, id]);

  function handleApplyClick() {
    if (!canApply(user, navigate, showToast)) return;
    setApplyOpen(true);
  }

  async function submitApplication(payload) {
    const success = await submitApplicationFn(job.id, payload, token, navigate, showToast);
    if (success) {
      setStatus("applied");
      setApplyOpen(false);
    }
  }

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  if (!job) {
    return (
      <div className="empty-state">
        <h3>Job not found</h3>
        <p><button className="btn link" onClick={() => navigate("/")}>Back to browse</button></p>
      </div>
    );
  }

  const isOwner = user?.role === "recruiter" && job.recruiter_id === user.id;

  return (
    <div>
      <div className="eyebrow"><button className="btn link" onClick={() => navigate(-1)}>← Back</button></div>
      <div className="job-head" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {job.company?.logo ? (
            <img src={job.company.logo} alt="" className="logo-md" />
          ) : (
            <div className="logo-md avatar-fallback">{(job.company?.name || "?").charAt(0).toUpperCase()}</div>
          )}
          <div>
            <h1 className="page-title" style={{ fontSize: 26 }}>{job.title}</h1>
            <div className="job-company">
              {job.company?.id ? (
                <Link className="job-company-link" to={`/company/${job.company.id}`}>{job.company.name}</Link>
              ) : (
                <span>{job.company?.name || job.company}</span>
              )}
              {" · "}{job.company?.location || job.location}
            </div>
          </div>
        </div>
        <div>
          {job.company?.registered
            ? <span className="registered-badge">Registered</span>
            : <span className="registered-badge" style={{ background: "var(--gray-300)", color: "var(--gray-600)" }}>Unregistered</span>
          }
        </div>
      </div>

      <div className="job-tags">
        {job.company?.type && <span className="tag">{job.company.type}</span>}
        {job.is_active === false && <span className="tag" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Closed</span>}
        <span className="tag dark">{job.type}</span>
        <span className="tag">{job.mode}</span>
        {job.experience_level && <span className="tag">{job.experience_level}</span>}
        {job.salary_min || job.salary_max ? (
          <span className="tag dark">
            {job.salary_currency || "INR"} {job.salary_min ? `${Number(job.salary_min).toLocaleString()}` : ""}
            {job.salary_min && job.salary_max ? " – " : ""}
            {job.salary_max ? `${Number(job.salary_max).toLocaleString()}` : ""}
          </span>
        ) : job.salary ? (
          <span className="tag dark">{job.salary}</span>
        ) : null}
        {job.required_skills?.length > 0 && (
          <>
            {job.required_skills.slice(0, 3).map((s) => <span className="tag" key={s}>{s}</span>)}
            {job.required_skills.length > 3 && <span className="tag">+{job.required_skills.length - 3} more</span>}
          </>
        )}
      </div>

      <div className="job-foot">
        <span className="job-meta">Posted {new Date(job.posted_at).toLocaleDateString()}</span>
        {job.openings > 1 && <span className="job-meta">{job.openings} openings</span>}
        {job.expires_at && (
          <span className="job-meta">Expires {new Date(job.expires_at).toLocaleDateString()}</span>
        )}
        {job.expires_at && new Date(job.expires_at) < new Date() && (
          <span className="tag" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Applications closed</span>
        )}
        {job.expires_at && new Date(job.expires_at) > new Date() && (new Date(job.expires_at) - new Date()) < 3 * 24 * 60 * 60 * 1000 && (
          <span className="tag" style={{ borderColor: "#f59e0b", color: "#f59e0b" }}>Closing soon</span>
        )}
        {isOwner && <span className="job-meta">{job.applicantCount} applicant{job.applicantCount === 1 ? "" : "s"}</span>}
      </div>

      <div className="job-detail-section">
        <div className="profile-label">Description</div>
        <p className="job-desc">{job.description}</p>
      </div>

      {job.requirements && (
        <div className="job-detail-section">
          <div className="profile-label">Requirements</div>
          <p className="job-desc">{job.requirements}</p>
        </div>
      )}

      {job.company?.id && (
        <div className="job-detail-section company-section">
          <div className="profile-label">About the company</div>
          <div className="company-info-block">
            <div className="company-info-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {job.company.logo ? (
                  <img src={job.company.logo} alt="" className="logo-sm" />
                ) : (
                  <div className="logo-sm avatar-fallback">{(job.company.name || "?").charAt(0).toUpperCase()}</div>
                )}
                <h3 className="company-info-name">{job.company.name}</h3>
                {job.company.registered
                  ? <span className="registered-badge">Registered</span>
                  : <span className="registered-badge" style={{ background: "var(--gray-300)", color: "var(--gray-600)" }}>Unregistered</span>
                }
              </div>
              <Link className="btn small outline" to={`/company/${job.company.id}`}>View company profile</Link>
            </div>
            <div className="job-tags" style={{ marginTop: 8 }}>
              {job.company.type && <span className="tag">{job.company.type}</span>}
              {job.company.size && <span className="tag">{job.company.size}</span>}
              {job.company.location && <span className="tag">{job.company.location}</span>}
            </div>
            {job.company.description && (
              <p className="job-desc" style={{ marginTop: 8 }}>
                {job.company.description.length > 300
                  ? job.company.description.slice(0, 300).trimEnd() + "..."
                  : job.company.description}
              </p>
            )}
          </div>
        </div>
      )}

      {team.length > 0 && (
        <div className="job-detail-section" style={{ marginTop: 24 }}>
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
                    <span className={statusClass(member.status)}>{statusLabel(member.status)}</span>
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

      <div className="job-foot" style={{ marginTop: 8 }}>
        <div className="job-actions">
          {status && (
            <>
              <span className={statusClass(status)}>{statusLabel(status)}</span>
              {job.is_active !== false && (status === "shortlisted" || status === "accepted") && (
                <button className="btn small outline" onClick={() => navigate(`/messages?job=${job.id}&with=${job.recruiter_id}`)}>
                  Message recruiter
                </button>
              )}
            </>
          )}
          {!status && !isOwner && job.is_active !== false && !(job.expires_at && new Date(job.expires_at) < new Date()) && (
            <button className="btn" onClick={handleApplyClick}>Apply now</button>
          )}
          {job.is_active === false && !status && !isOwner && (
            <span className="job-meta">This posting is no longer accepting applications.</span>
          )}
        </div>
      </div>

      {applyOpen && (
        <ApplyModal
          job={job}
          defaultName={user?.name}
          defaultEmail={user?.email}
          defaultPhone={user?.phone}
          onClose={() => setApplyOpen(false)}
          onSubmit={submitApplication}
        />
      )}
    </div>
  );
}
