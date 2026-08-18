import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const TYPES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Design", "Consulting", "Manufacturing", "Retail", "Other"];
const SIZES = ["", "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export default function EditCompany() {
  const { token, company, refreshCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        location: company.location || "",
        type: company.type || "Technology",
        size: company.size || "",
        website: company.website || "",
        description: company.description || "",
      });
    }
  }, [company]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim() || !form.description.trim()) {
      setError("Name, location, and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.updateCompany(company.id, form, token);
      await refreshCompany();
      navigate(`/company/${company.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!form) {
    return (
      <div className="empty-state">
        <h3>No company registered</h3>
        <p>You need a registered company before editing.</p>
        <p><button className="btn" onClick={() => navigate("/register-company")}>Register company</button></p>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">Company</div>
      <h1 className="page-title">Edit company</h1>
      <p className="page-sub">Update your company details — changes appear immediately.</p>
      <div className="panel">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cname">Company name</label>
          <input id="cname" maxLength={120} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Acme Inc." />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="clocation">Location</label>
            <input id="clocation" maxLength={120} value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Delhi, India" />
          </div>
          <div className="field">
            <label htmlFor="ctype">Industry</label>
            <select id="ctype" value={form.type} onChange={(e) => update("type", e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="csize">Company size</label>
            <select id="csize" value={form.size} onChange={(e) => update("size", e.target.value)}>
              <option value="">Select size</option>
              {SIZES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cwebsite">Website</label>
            <input id="cwebsite" maxLength={200} value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://example.com" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="cdesc">Description</label>
          <textarea id="cdesc" maxLength={5000} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What does your company do? Culture, mission, what makes it unique…" />
        </div>

        {error && <div className="error-text">{error}</div>}
        <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
      </div>
    </div>
  );
}
