import { useState } from "react";

export default function ApplyModal({ job, defaultName, defaultEmail, onClose, onSubmit }) {
  const [name, setName] = useState(defaultName || "");
  const [email, setEmail] = useState(defaultEmail || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !EMAIL_RE.test(email)) {
      setError("Enter your name and a valid email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit({ name, email, note });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Apply — {job.title}</h3>
        <p className="modal-sub">{job.company?.name || job.company} · {job.company?.location || job.location}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="a-name">Your name</label>
            <input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="field">
            <label htmlFor="a-email">Email</label>
            <input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="field">
            <label htmlFor="a-note">Cover note (optional)</label>
            <textarea id="a-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you're a fit for this role…" style={{ minHeight: 70 }} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Submitting…" : "Submit application"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
