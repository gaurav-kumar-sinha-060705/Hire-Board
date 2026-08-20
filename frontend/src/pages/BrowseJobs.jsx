import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ApplyModal from "../components/ApplyModal.jsx";
import { canApply, submitApplication as submitApplicationFn } from "../applyGuard.js";


export default function BrowseJobs() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [applyTarget, setApplyTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [appliedIds, setAppliedIds] = useState(new Set());

  useEffect(() => {
    if (user?.role === "seeker" && token) {
      api.myAppliedJobIds(token).then((d) => {
        setAppliedIds(new Set(d.jobIds));
      }).catch(() => {});
    }
  }, [user, token]);

  const loadJobs = useCallback(async (q, p) => {
    const data = await api.listJobs(q, undefined, p, 12);
    setJobs(data.jobs);
    setTotalPages(data.totalPages);
  }, []);

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
    if (!canApply(user, navigate, showToast)) return;
    setApplyTarget(job);
  }

  async function submitApplication(payload) {
    const success = await submitApplicationFn(applyTarget.id, payload, token, navigate, showToast);
    if (success) {
      setAppliedIds((prev) => new Set([...prev, applyTarget.id]));
      setApplyTarget(null);
    }
  }

  const visibleJobs = jobs.filter((j) => !appliedIds.has(j.id));

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

      {!loading && !error && visibleJobs.length === 0 && (
        <div className="empty-state">
          <h3>No jobs found</h3>
          <p>{query ? "Try a different search." : "Check back soon, or post the first role."}</p>
        </div>
      )}

      {visibleJobs.map((job) => (
          <div className="job" key={job.id}>
            <div className="job-head">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {job.company?.logo ? (
                  <img src={job.company.logo} alt="" className="logo-sm" />
                ) : (
                  <div className="logo-sm avatar-fallback">{(job.company?.name || "?").charAt(0).toUpperCase()}</div>
                )}
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
              </div>
              <div>
                {job.company?.registered
                  ? <span className="registered-badge">Registered</span>
                  : <span className="registered-badge" style={{ background: "var(--gray-300)", color: "var(--gray-600)" }}>Unregistered</span>
                }
              </div>
            </div>
            <div className="job-tags">
              <span className="tag dark">{job.type}</span>
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
              {job.openings > 1 && <span className="job-meta">{job.openings} openings</span>}
              {job.expires_at && new Date(job.expires_at) < new Date() && (
                <span className="tag" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Applications closed</span>
              )}
              {job.expires_at && new Date(job.expires_at) > new Date() && (new Date(job.expires_at) - new Date()) < 3 * 24 * 60 * 60 * 1000 && (
                <span className="tag" style={{ borderColor: "#f59e0b", color: "#f59e0b" }}>Closing soon</span>
              )}
              <div className="job-actions">
                {!(job.expires_at && new Date(job.expires_at) < new Date()) && (
                  <button className="btn small" onClick={() => handleApplyClick(job)}>Apply now</button>
                )}
              </div>
            </div>
          </div>
      ))}

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
          defaultPhone={user?.phone}
          onClose={() => setApplyTarget(null)}
          onSubmit={submitApplication}
        />
      )}
    </div>
  );
}
