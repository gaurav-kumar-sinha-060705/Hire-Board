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
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySent, setVerifySent] = useState(false);

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
    const check = canApply(user, navigate, showToast);
    if (check === "verify") {
      setApplyTarget(job);
      openVerifyModal();
      return;
    }
    if (!check) return;
    setApplyTarget(job);
  }

  function openVerifyModal() {
    setShowVerifyModal(true);
    setVerifyOtp("");
    setVerifyError("");
    setVerifySent(false);
    sendOtp();
  }

  async function sendOtp() {
    try {
      const data = await api.resendOtp({ email: user.email });
      setVerifySent(true);
      if (import.meta.env.DEV && data.devOtp) {
        setVerifyError(`Dev OTP: ${data.devOtp}`);
        setVerifyError("");
      }
    } catch (err) {
      setVerifyError(err.message);
    }
  }

  async function handleVerifySubmit(e) {
    e.preventDefault();
    if (!verifyOtp.trim() || verifyOtp.length !== 6) {
      setVerifyError("Enter the 6-digit code.");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      await api.verifyEmail({ email: user.email, otp: verifyOtp });
      window.location.reload();
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function submitApplication(payload) {
    const result = await submitApplicationFn(applyTarget.id, payload, token, navigate, showToast);
    if (result === "verify") {
      openVerifyModal();
      return;
    }
    if (result === true) {
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

      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Verify your email</h3>
            <p className="modal-sub">Enter the 6-digit code sent to <strong>{user?.email}</strong></p>
            <form onSubmit={handleVerifySubmit}>
              <div className="field">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  style={{ letterSpacing: 6, textAlign: "center", fontSize: 20, fontWeight: 600 }}
                />
              </div>
              {verifyError && <div className="error-text">{verifyError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn outline" onClick={() => setShowVerifyModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={verifyLoading}>
                  {verifyLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
            <p className="center-note" style={{ marginTop: 12 }}>
              <button className="btn link" onClick={sendOtp} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-600)", textDecoration: "underline" }}>
                Resend code
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
