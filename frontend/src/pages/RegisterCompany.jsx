import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const TYPES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Design", "Consulting", "Manufacturing", "Retail", "Other"];
const SIZES = ["", "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const initial = {
  name: "", location: "", type: "Technology", size: "", website: "", description: "",
};

export default function RegisterCompany() {
  const { token, refreshCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      await api.createCompany(form, token);
      await refreshCompany();
      navigate("/my-jobs");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="eyebrow">Step 2 of 2</div>
      <h1 className="page-title">Register your company</h1>
      <p className="page-sub">Tell seekers about your organization. This appears on all your job postings.</p>
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
          {loading ? "Registering company…" : "Register company"}
        </button>
      </form>
      </div>
    </div>
  );
}
