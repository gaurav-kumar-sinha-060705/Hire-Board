import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ApplyModal from "../components/ApplyModal.jsx";
import { statusLabel, statusClass } from "../status.js";
import { jobTicketId } from "../utils.js";

export default function BrowseJobs() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [statusByJob, setStatusByJob] = useState({});
  const [applyTarget, setApplyTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadJobs = useCallback(async (q, p) => {
    const data = await api.listJobs(q, undefined, p, 12);
    setJobs(data.jobs);
    setTotalPages(data.totalPages);
  }, []);

  useEffect(() => {
    if (user?.role === "seeker" && token) {
      api.myApplications(token).then((d) => {
        const map = {};
        for (const a of d.applications) map[a.job_id] = a.status;
        setStatusByJob(map);
      }).catch(() => {});
    }
  }, [user, token]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      loadJobs(query, page)
        .catch(() => setError("Failed to load jobs."))
        .finally(() => setLoading(false));
    }, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, page, loadJobs]);

  function handleApplyClick(job) {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "seeker") {
      showToast("Sign in as a job seeker to apply.");
      return;
    }
    if (!user.email_verified) {
      showToast("Verify your email to apply.");
      navigate("/verify-email");
      return;
    }
    if (!user.profile?.headline || !user.profile?.skills || user.profile.skills.length === 0) {
      showToast("Complete your profile to apply.");
      navigate("/profile");
      return;
    }
    setApplyTarget(job);
  }

  async function submitApplication(payload) {
    try {
      await api.applyToJob(applyTarget.id, payload, token);
      setStatusByJob((m) => ({ ...m, [applyTarget.id]: "applied" }));
      setApplyTarget(null);
      showToast("Application submitted.");
    } catch (err) {
      if (/verify/i.test(err.message)) {
        setApplyTarget(null);
        showToast("Verify your email to apply.");
        navigate("/verify-email");
      } else if (/profile/i.test(err.message)) {
        setApplyTarget(null);
        showToast("Complete your profile to apply.");
        navigate("/profile");
      } else {
        throw err;
      }
    }
  }

  return (
    <div>
      <div className="eyebrow">Open roles</div>
      <h1 className="page-title">Browse jobs</h1>
      <p className="page-sub">Search current postings and apply directly.</p>

      <div className="search-row">
        <input
          type="text"
          placeholder="Search by title, company, or location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!loading && error && (
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <p><button className="btn link" onClick={() => { setLoading(true); setError(null); loadJobs(query, page).catch(() => setError("Failed to load jobs.")).finally(() => setLoading(false)); }}>Try again</button></p>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="empty-state">
          <h3>No jobs found</h3>
          <p>{query ? "Try a different search." : "Check back soon, or post the first role."}</p>
        </div>
      )}

      {jobs.map((job) => {
        const status = statusByJob[job.id];
        const applied = Boolean(status);
        return (
          <div className="job" key={job.id}>
            <div className="job-head">
              <div>
                <h2 className="job-title"><Link className="job-title-link" to={`/jobs/${job.id}`}>{job.title}</Link></h2>
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
              <span className="tag dark">{job.type}</span>
              <span className="tag">{job.mode}</span>
              {job.salary && <span className="tag">{job.salary}</span>}
            </div>
            <p className="job-desc job-desc-truncated">
              {job.description.length > 220 ? job.description.slice(0, 220).trimEnd() + "…" : job.description}
              {job.description.length > 220 && (
                <Link className="btn link" to={`/jobs/${job.id}`} style={{ marginLeft: 6 }}>Read more</Link>
              )}
            </p>
            <div className="job-foot">
              <span className="job-meta">Posted {new Date(job.posted_at).toLocaleDateString()}</span>
              <div className="job-actions">
                {applied && (status === "shortlisted" || status === "accepted") && (
                  <>
                    <span className={statusClass(status)}>{statusLabel(status)}</span>
                    <button className="btn small outline" onClick={() => navigate(`/messages?job=${job.id}&with=${job.recruiter_id}`)}>
                      Message recruiter
                    </button>
                  </>
                )}
                {applied && status !== "shortlisted" && status !== "accepted" && (
                  <span className={statusClass(status)}>{statusLabel(status)}</span>
                )}
                {!applied && (
                  <button className="btn small" onClick={() => handleApplyClick(job)}>Apply now</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}

      {applyTarget && (
        <ApplyModal
          job={applyTarget}
          defaultName={user?.name}
          defaultEmail={user?.email}
          onClose={() => setApplyTarget(null)}
          onSubmit={submitApplication}
        />
      )}
    </div>
  );
}
