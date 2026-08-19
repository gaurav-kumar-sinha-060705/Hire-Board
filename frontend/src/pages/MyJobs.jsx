import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { STATUS_OPTIONS } from "../status.js";
import { jobTicketId } from "../utils.js";

export default function MyJobs() {
  const { token } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [applicantsByJob, setApplicantsByJob] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    api.myJobs(token).then((d) => setJobs(d.jobs)).catch(() => setError("Failed to load jobs.")).finally(() => setLoading(false));
  }, [token]);

  async function toggleApplicants(jobId) {
    if (openId === jobId) {
      setOpenId(null);
      return;
    }
    setOpenId(jobId);
    if (!applicantsByJob[jobId]) {
      try {
        const data = await api.applicants(jobId, token);
        setApplicantsByJob((m) => ({ ...m, [jobId]: data.applicants }));
      } catch (err) {
        showToast(err.message);
        setOpenId(null);
      }
    }
  }

  async function handleToggleActive(jobId) {
    try {
      const data = await api.toggleActiveJob(jobId, token);
      setJobs((list) => list.map((j) => (j.id === jobId ? data.job : j)));
      showToast(data.job.is_active ? "Posting reopened." : "Posting closed.");
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteJob(deleteTarget.id, token);
      setJobs((list) => list.filter((j) => j.id !== deleteTarget.id));
      setDeleteTarget(null);
      setApplicantsByJob((m) => { const { [deleteTarget.id]: _, ...rest } = m; return rest; });
      showToast("Posting deleted.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(jobId, appId, status) {
    try {
      const data = await api.updateApplicationStatus(jobId, appId, status, token);
      setApplicantsByJob((m) => ({
        ...m,
        [jobId]: m[jobId].map((a) => (a.id === appId ? data.application : a)),
      }));
      showToast("Application status updated.");
    } catch (err) {
      showToast(err.message);
    }
  }

  async function openProfile(applicant) {
    setProfileTarget(applicant);
    setProfileData(null);
    setProfileLoading(true);
    try {
      const data = await api.getProfile(applicant.seeker_id, token);
      setProfileData(data.user);
    } catch (err) {
      showToast(err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  if (error) return (
    <div className="empty-state">
      <h3>Something went wrong</h3>
      <p>{error}</p>
      <p><button className="btn link" onClick={() => { setLoading(true); setError(null); api.myJobs(token).then((d) => setJobs(d.jobs)).catch(() => setError("Failed to load jobs.")).finally(() => setLoading(false)); }}>Try again</button></p>
    </div>
  );

  return (
    <div>
      <div className="eyebrow">Dashboard</div>
      <h1 className="page-title">Your postings</h1>
      <p className="page-sub">Review roles you've posted and who has applied.</p>

      {jobs.length === 0 && (
        <div className="empty-state">
          <h3>No jobs posted yet</h3>
          <p><Link className="btn link" to="/post">Post your first job</Link></p>
        </div>
      )}

      {jobs.map((job) => (
        <div className="job" key={job.id}>
          <div className="job-head">
            <div>
              <h2 className="job-title">{job.title}</h2>
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
            <span className="job-meta">{job.applicantCount} applicant{job.applicantCount === 1 ? "" : "s"}</span>
            <div className="job-actions">
              {job.applicantCount > 0 && (
                <button className="btn small outline" onClick={() => toggleApplicants(job.id)}>
                  {openId === job.id ? "Hide applicants" : "View applicants"}
                </button>
              )}
              <button className="btn small outline" onClick={() => navigate(`/post?id=${job.id}`)}>Edit</button>
              <button className="btn small outline" onClick={() => handleToggleActive(job.id)}>
                {job.is_active === false ? "Reopen" : "Close"}
              </button>
              <button className="btn small outline danger" onClick={() => setDeleteTarget(job)}>Delete</button>
            </div>
          </div>

          {openId === job.id && applicantsByJob[job.id] && (
            <div className="applicants-block">
              {applicantsByJob[job.id].map((a) => (
                <div className="applicant-row" key={a.id}>
                  <div>
                    <div className="applicant-name">{a.name}</div>
                    <div className="applicant-email">{a.email}</div>
                    {a.note && <div className="applicant-note">"{a.note}"</div>}
                  </div>
                  <div className="applicant-side">
                    <select
                      className="status-select"
                      value={a.status || "applied"}
                      onChange={(e) => handleStatusChange(job.id, a.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <span className="job-meta">{new Date(a.applied_at).toLocaleDateString()}</span>
                    <button className="btn small outline" onClick={() => openProfile(a)}>View profile</button>
                    {(a.status === "shortlisted" || a.status === "accepted") && (
                      <button
                        className="btn small outline"
                        onClick={() => navigate(`/messages?job=${job.id}&with=${a.seeker_id}`)}
                      >Message</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete posting?</h3>
            <p className="modal-sub">
              {deleteTarget.title} at {deleteTarget.company?.name || deleteTarget.company} will be removed, along with{" "}
              {deleteTarget.applicantCount} application{deleteTarget.applicantCount === 1 ? "" : "s"}. This can't be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="btn danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete posting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileTarget && (
        <div className="modal-overlay" onClick={() => setProfileTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{profileTarget.name}</h3>
            <p className="modal-sub">{profileTarget.email}</p>
            {profileData ? (
              <div className="profile-view">
                {profileData.profile?.headline && <div className="profile-headline">{profileData.profile.headline}</div>}
                {profileData.profile?.location && <div className="profile-line">{profileData.profile.location}</div>}
                {profileData.profile?.skills?.length > 0 && (
                  <div className="job-tags">{profileData.profile.skills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
                )}
                {profileData.profile?.experience && (
                  <>
                    <div className="profile-label">Experience</div>
                    <p className="profile-text">{profileData.profile.experience}</p>
                  </>
                )}
                {profileData.profile?.bio && (
                  <>
                    <div className="profile-label">About</div>
                    <p className="profile-text">{profileData.profile.bio}</p>
                  </>
                )}
                {profileData.profile?.linkedin && (
                  <div className="profile-line">
                    <a
                      href={/^[a-z][a-z0-9+.-]*:\/\//i.test(profileData.profile.linkedin) ? profileData.profile.linkedin : "https://" + profileData.profile.linkedin}
                      target="_blank"
                      rel="noreferrer"
                    >LinkedIn profile</a>
                  </div>
                )}
                {profileData.profile?.resume && (
                  <div className="modal-actions" style={{ marginTop: 20 }}>
                    <a className="btn small" href={profileData.profile.resume.dataUrl} download={profileData.profile.resume.name}>Download resume</a>
                  </div>
                )}
              </div>
            ) : (
              <p className="modal-sub">{profileLoading ? "Loading profile…" : "No profile on file."}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
