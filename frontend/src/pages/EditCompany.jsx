import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { TYPES, SIZES, BENEFITS_OPTIONS } from "../companyConstants.js";

export default function EditCompany() {
  const { token, company, refreshCompany, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        location: company.location || "",
        type: company.type || "Technology",
        size: company.size || "",
        website: company.website || "",
        description: company.description || "",
        logo: company.logo || "",
        founded_year: company.founded_year || "",
        social_links: company.social_links || { linkedin: "", twitter: "", facebook: "", instagram: "" },
        tech_stack: Array.isArray(company.tech_stack) ? company.tech_stack.join(", ") : "",
        benefits: company.benefits || [],
        culture: company.culture || "",
        registered: company.registered || false,
      });
    }
  }, [company]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateSocial(key, value) {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: value } }));
  }

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("logo", reader.result);
    reader.readAsDataURL(file);
  }

  function addTechTag() {
    const tags = techInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length) {
      update("tech_stack", form.tech_stack ? form.tech_stack + ", " + tags.join(", ") : tags.join(", "));
      setTechInput("");
    }
  }

  function removeTechTag(tag) {
    const current = form.tech_stack.split(",").map((t) => t.trim()).filter((t) => t && t !== tag);
    update("tech_stack", current.join(", "));
  }

  function toggleBenefit(b) {
    setForm((f) => {
      const arr = f.benefits.includes(b) ? f.benefits.filter((x) => x !== b) : [...f.benefits, b];
      return { ...f, benefits: arr };
    });
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
      const payload = {
        ...form,
        tech_stack: form.tech_stack ? form.tech_stack.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      await api.updateCompany(company.id, payload, token);
      await refreshCompany();
      await refreshUser();
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
          <label htmlFor="cname">Company name *</label>
          <input id="cname" maxLength={120} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Acme Inc." />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="clocation">Location *</label>
            <input id="clocation" maxLength={120} value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Delhi, India" />
          </div>
          <div className="field">
            <label htmlFor="ctype">Industry</label>
            <select id="ctype" value={form.type} onChange={(e) => update("type", e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row-3">
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
          <div className="field">
            <label htmlFor="cfounded">Founded year</label>
            <input id="cfounded" type="number" min={1900} max={new Date().getFullYear()} value={form.founded_year} onChange={(e) => update("founded_year", e.target.value)} placeholder="2020" />
          </div>
        </div>

        <div className="field">
          <label>Company status *</label>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              <input type="radio" name="registered" checked={form.registered === false} onChange={() => update("registered", false)} style={{ width: "auto", accentColor: "var(--black)" }} />
              Unregistered
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              <input type="radio" name="registered" checked={form.registered === true} onChange={() => update("registered", true)} style={{ width: "auto", accentColor: "var(--black)" }} />
              Registered
            </label>
          </div>
        </div>

        <div className="field">
          <label htmlFor="cdesc">Description *</label>
          <textarea id="cdesc" maxLength={5000} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What does your company do? Culture, mission, what makes it unique…" />
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <label>Logo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ cursor: "pointer" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", border: "2px dashed #ccc",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", background: "#f5f5f5",
              }}>
                {form.logo ? (
                  <img src={form.logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 12, color: "#999", textAlign: "center", padding: 4 }}>Upload</span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            </label>
            {form.logo && (
              <button type="button" className="btn" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => update("logo", "")}>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>Social links</label>
          <div className="field-row">
            <div className="field">
              <input maxLength={200} value={form.social_links.linkedin} onChange={(e) => updateSocial("linkedin", e.target.value)} placeholder="LinkedIn URL" />
            </div>
            <div className="field">
              <input maxLength={200} value={form.social_links.twitter} onChange={(e) => updateSocial("twitter", e.target.value)} placeholder="Twitter / X URL" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <input maxLength={200} value={form.social_links.facebook} onChange={(e) => updateSocial("facebook", e.target.value)} placeholder="Facebook URL" />
            </div>
            <div className="field">
              <input maxLength={200} value={form.social_links.instagram} onChange={(e) => updateSocial("instagram", e.target.value)} placeholder="Instagram URL" />
            </div>
          </div>
        </div>

        <div className="field">
          <label>Tech stack</label>
          <div className="tag-input-row">
            <input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTechTag(); } }} placeholder="React, Node.js, PostgreSQL, AWS" />
            <button type="button" className="btn tag-input-btn" onClick={addTechTag}>Add</button>
          </div>
          {form.tech_stack && (
            <div className="job-tags" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {form.tech_stack.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTechTag(tag)} style={{ marginLeft: 4, background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Benefits</label>
          <div className="checkbox-grid">
            {BENEFITS_OPTIONS.map((b) => (
              <label key={b}>
                <input type="checkbox" checked={form.benefits.includes(b)} onChange={() => toggleBenefit(b)} />
                {b}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="cculture">Culture</label>
          <textarea id="cculture" maxLength={3000} value={form.culture} onChange={(e) => update("culture", e.target.value)} placeholder="Describe your company culture and values…" rows={4} />
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
