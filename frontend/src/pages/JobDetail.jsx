import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ApplyModal from "../components/ApplyModal.jsx";
import { statusLabel, statusClass } from "../status.js";
import { jobTicketId } from "../utils.js";

export default function JobDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [job, setJob] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getJob(id).then((d) => setJob(d.job)).catch(() => setJob(null)).finally(() => setLoading(false));
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
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "seeker") {
      showToast("Sign in as a job seeker to apply.");
      return;
    }
    setApplyOpen(true);
  }

  async function submitApplication(payload) {
    await api.applyToJob(job.id, payload, token);
    setStatus("applied");
    setApplyOpen(false);
    showToast("Application submitted.");
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
        <div className="job-id">{jobTicketId(job.id)}</div>
      </div>

      <div className="job-tags">
        {job.company?.type && <span className="tag">{job.company.type}</span>}
        {job.is_active === false && <span className="tag" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Closed</span>}
        <span className="tag dark">{job.type}</span>
        <span className="tag">{job.mode}</span>
        {job.salary && <span className="tag">{job.salary}</span>}
      </div>

      <div className="job-foot">
        <span className="job-meta">Posted {new Date(job.posted_at).toLocaleDateString()}</span>
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
              <h3 className="company-info-name">{job.company.name}</h3>
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
                  ? job.company.description.slice(0, 300).trimEnd() + "…"
                  : job.company.description}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="job-foot" style={{ marginTop: 8 }}>
        <div className="job-actions">
          {status && (
            <>
              <span className={statusClass(status)}>{statusLabel(status)}</span>
              {job.is_active !== false && (
                <button className="btn small outline" onClick={() => navigate(`/messages?job=${job.id}&with=${job.recruiter_id}`)}>
                  Message recruiter
                </button>
              )}
            </>
          )}
          {!status && !isOwner && job.is_active !== false && (
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
          onClose={() => setApplyOpen(false)}
          onSubmit={submitApplication}
        />
      )}
    </div>
  );
}
