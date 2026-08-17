import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const initial = {
  title: "", companyId: "", location: "", type: "Full-time",
  mode: "On-site", salary: "", description: "", requirements: "",
};

export default function PostJob() {
  const { token, company } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(Boolean(editingId));

  useEffect(() => {
    if (editingId) {
      api.getJob(editingId).then((d) => {
        setForm({
          title: d.job.title,
          companyId: d.job.companyId || "",
          location: d.job.location,
          type: d.job.type,
          mode: d.job.mode,
          salary: d.job.salary || "",
          description: d.job.description,
          requirements: d.job.requirements || "",
        });
      }).catch((err) => {
        setError(err.message);
      }).finally(() => setLoadingJob(false));
    } else if (company) {
      setForm((f) => ({
        ...f,
        companyId: company.id,
        location: f.location || company.location,
      }));
    }
  }, [editingId, company]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.companyId || !form.location.trim() || !form.description.trim()) {
      setError("Title, company, location, and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await api.updateJob(editingId, form, token);
      } else {
        await api.postJob(form, token);
      }
      navigate("/my-jobs");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingJob) return null;

  if (!company && !editingId) {
    return (
      <div className="empty-state">
        <h3>Register your company first</h3>
        <p>You need a registered company before posting jobs.</p>
        <p><button className="btn" onClick={() => navigate("/register-company")}>Register company</button></p>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">For recruiters</div>
      <h1 className="page-title">{editingId ? "Edit posting" : "Post a job"}</h1>
      <p className="page-sub">{editingId ? "Update the details — changes appear immediately." : "This appears on Browse jobs immediately after posting."}</p>

      <form onSubmit={handleSubmit} className="panel">
        <div className="field">
          <label htmlFor="title">Job title</label>
          <input id="title" maxLength={120} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Frontend Engineer" />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Company</label>
            <div className="field-static">{company?.name || "Loading…"}</div>
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" maxLength={120} value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Remote / Delhi, IN" />
          </div>
        </div>

        <div className="field-row-3">
          <div className="field">
            <label htmlFor="type">Job type</label>
            <select id="type" value={form.type} onChange={(e) => update("type", e.target.value)}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Internship</option>
              <option>Contract</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="mode">Work mode</label>
            <select id="mode" value={form.mode} onChange={(e) => update("mode", e.target.value)}>
              <option>On-site</option>
              <option>Remote</option>
              <option>Hybrid</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="salary">Salary (optional)</label>
            <input id="salary" maxLength={60} value={form.salary} onChange={(e) => update("salary", e.target.value)} placeholder="₹8–12 LPA" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" maxLength={20000} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What the role involves, responsibilities, day-to-day…" />
        </div>

        <div className="field">
          <label htmlFor="requirements">Requirements</label>
          <textarea id="requirements" maxLength={20000} value={form.requirements} onChange={(e) => update("requirements", e.target.value)} placeholder="Skills, experience, qualifications…" />
        </div>

        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Saving…" : editingId ? "Save changes" : "Post job"}
        </button>
      </form>
    </div>
  );
}
