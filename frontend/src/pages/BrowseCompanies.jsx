import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function BrowseCompanies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async (q, p) => {
    const data = await api.listCompanies(p, 12, q);
    setCompanies(data.companies);
    setTotalPages(data.totalPages);
  }, []);

  useEffect(() => { setPage(1); }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    load(query, page)
      .catch(() => setError("Failed to load companies."))
      .finally(() => setLoading(false));
  }, [query, page, load]);

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  return (
    <div>
      <div className="eyebrow">Directory</div>
      <h1 className="page-title">Companies</h1>
      <p className="page-sub">Discover organizations hiring on Hire Board.</p>

      <div className="search-row">
        <input
          type="text"
          placeholder="Search by name, location, or industry"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!loading && error && (
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <p><button className="btn link" onClick={() => { setLoading(true); setError(null); load(query, page).catch(() => setError("Failed to load companies.")).finally(() => setLoading(false)); }}>Try again</button></p>
        </div>
      )}

      {!loading && !error && companies.length === 0 && (
        <div className="empty-state">
          <h3>No companies found</h3>
          <p>{query ? "Try a different search." : "No companies registered yet."}</p>
        </div>
      )}

      {!error && companies.map((c) => {
        const isExpanded = !!expanded[c.id];
        const isLong = c.description && c.description.length > 160;
        return (
          <div
            className={`company-card${isExpanded ? " expanded" : ""}`}
            key={c.id}
            style={{ cursor: "pointer" }}
            onClick={(e) => { if (!e.target.closest(".show-more-btn")) navigate(`/company/${c.id}`); }}
          >
            <div className="company-card-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {c.logo ? (
                  <img src={c.logo} alt={c.name} className="logo-sm" />
                ) : (
                  <div className="logo-sm avatar-fallback">{c.name?.charAt(0)?.toUpperCase() || "?"}</div>
                )}
                <h2 className="company-card-name">{c.name}</h2>
              </div>
              <div className="job-id" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {c.jobCount} open role{c.jobCount === 1 ? "" : "s"}
                {c.registered
                  ? <span className="registered-badge">Registered</span>
                  : <span className="registered-badge" style={{ background: "var(--gray-300)", color: "var(--gray-600)" }}>Unregistered</span>
                }
              </div>
            </div>
            <div className="job-company">{c.location} · {c.type}{c.size ? ` · ${c.size}` : ""}</div>
            {c.description && (
              <>
                <p className="job-desc" style={{ marginTop: 8 }}>
                  {isLong && !isExpanded
                    ? c.description.slice(0, 160).trimEnd() + "…"
                    : c.description
                  }
                </p>
                {isLong && (
                  <button
                    className="btn link show-more-btn"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(c.id); }}
                    style={{ marginTop: 4, fontSize: 13, padding: 0 }}
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </>
            )}
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
    </div>
  );
}
