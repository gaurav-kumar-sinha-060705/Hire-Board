import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function BrowseCompanies() {
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (p) => {
    const data = await api.listCompanies(p, 12);
    setCompanies(data.companies);
    setTotalPages(data.totalPages);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    load(page)
      .catch(() => setError("Failed to load companies."))
      .finally(() => setLoading(false));
  }, [page, load]);

  const filtered = query
    ? companies.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.location || "").toLowerCase().includes(query.toLowerCase()) ||
          (c.type || "").toLowerCase().includes(query.toLowerCase())
      )
    : companies;

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
          <p><button className="btn link" onClick={() => { setLoading(true); setError(null); load(page).catch(() => setError("Failed to load companies.")).finally(() => setLoading(false)); }}>Try again</button></p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <h3>No companies found</h3>
          <p>{query ? "Try a different search." : "No companies registered yet."}</p>
        </div>
      )}

      {!error && filtered.map((c) => (
        <Link className="company-card" key={c.id} to={`/company/${c.id}`}>
          <div className="company-card-head">
            <h2 className="company-card-name">{c.name}</h2>
            <div className="job-id">{c.jobCount} open role{c.jobCount === 1 ? "" : "s"}</div>
          </div>
          <div className="job-company">{c.location} · {c.type}{c.size ? ` · ${c.size}` : ""}</div>
          {c.description && (
            <p className="job-desc job-desc-truncated" style={{ marginTop: 8 }}>
              {c.description.length > 160 ? c.description.slice(0, 160).trimEnd() + "…" : c.description}
            </p>
          )}
        </Link>
      ))}

      {totalPages > 1 && !query && (
        <div className="pagination">
          <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}
