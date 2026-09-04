import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { BENEFITS_OPTIONS } from "../companyConstants.js";

const initial = {
  title: "", companyId: "", location: "", type: "Full-time",
  mode: "On-site", description: "", requirements: "",
  experience_level: "", salary_min: "", salary_max: "", salary_currency: "INR",
  openings: 1, required_skills: "", benefits: [], expires_at: "",
};

export default function PostJob() {
  const { token, company, user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(Boolean(editingId));
  const [skillsInput, setSkillsInput] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  useEffect(() => {
    if (!user?.email_verified && !editingId) {
      navigate("/verify-email");
    }
  }, [user]);

  useEffect(() => {
    if (editingId) {
      api.getJob(editingId).then((d) => {
        setForm({
          title: d.job.title,
          companyId: d.job.company_id || "",
          location: d.job.location,
          type: d.job.type,
          mode: d.job.mode,
          description: d.job.description,
          requirements: d.job.requirements || "",
          experience_level: d.job.experience_level || "",
          salary_min: d.job.salary_min || "",
          salary_max: d.job.salary_max || "",
          salary_currency: d.job.salary_currency || "INR",
          openings: d.job.openings || 1,
          required_skills: Array.isArray(d.job.required_skills) ? d.job.required_skills.join(", ") : "",
          benefits: d.job.benefits || [],
          expires_at: d.job.expires_at ? d.job.expires_at.split("T")[0] : "",
        });
      }).catch((err) => {
        setError(err.message);
      }).finally(() => setLoadingJob(false));
    } else if (company) {
      setForm({
        ...initial,
        companyId: company.id,
        location: company.location,
      });
    }
  }, [editingId, company]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addSkillTag() {
    const tags = skillsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length) {
      update("required_skills", form.required_skills ? form.required_skills + ", " + tags.join(", ") : tags.join(", "));
      setSkillsInput("");
    }
  }

  function removeSkillTag(tag) {
    const current = form.required_skills.split(",").map((t) => t.trim()).filter((t) => t && t !== tag);
    update("required_skills", current.join(", "));
  }

  function toggleBenefit(b) {
    setForm((f) => {
      const arr = f.benefits.includes(b) ? f.benefits.filter((x) => x !== b) : [...f.benefits, b];
      return { ...f, benefits: arr };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user?.email_verified) {
      navigate("/verify-email");
      return;
    }
    if (!form.title.trim() || !form.companyId || !form.location.trim() || !form.description.trim()) {
      setError("Title, company, location, and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        required_skills: form.required_skills ? form.required_skills.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      if (editingId) {
        await api.updateJob(editingId, payload, token);
      } else {
        await api.postJob(payload, token);
      }
      navigate("/my-jobs");
    } catch (err) {
      if (err.message && /verify/i.test(err.message)) {
        navigate("/verify-email");
      } else if (err.message && /register your company/i.test(err.message)) {
        showToast("Register your company first.");
        navigate("/register-company");
      } else if (err.message && /complete your profile/i.test(err.message)) {
        showToast("Complete your profile first.");
        navigate("/profile");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingJob) return null;

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
            <label htmlFor="experience_level">Experience level</label>
            <select id="experience_level" value={form.experience_level} onChange={(e) => update("experience_level", e.target.value)}>
              <option value="">Select level</option>
              <option>Internship</option>
              <option>Entry level</option>
              <option>Associate</option>
              <option>Mid-Senior level</option>
              <option>Director</option>
              <option>Executive</option>
            </select>
          </div>
        </div>

        <div className="field-row-3">
          <div className="field">
            <label htmlFor="salary_min">Salary min</label>
            <input id="salary_min" type="number" min={0} value={form.salary_min} onChange={(e) => update("salary_min", e.target.value)} placeholder="300000" />
          </div>
          <div className="field">
            <label htmlFor="salary_max">Salary max</label>
            <input id="salary_max" type="number" min={0} value={form.salary_max} onChange={(e) => update("salary_max", e.target.value)} placeholder="600000" />
          </div>
          <div className="field">
            <label htmlFor="salary_currency">Currency</label>
            <select id="salary_currency" value={form.salary_currency} onChange={(e) => update("salary_currency", e.target.value)}>
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="openings">Openings</label>
            <input id="openings" type="number" min={1} value={form.openings} onChange={(e) => update("openings", parseInt(e.target.value) || 1)} />
          </div>
          <div className="field">
            <label htmlFor="expires_at">Application deadline</label>
            <input id="expires_at" type="date" min={minDate} value={form.expires_at} onChange={(e) => update("expires_at", e.target.value)} />
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

        <div className="field">
          <label>Required skills</label>
          <div className="tag-input-row">
            <input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkillTag(); } }} placeholder="React, TypeScript, SQL" />
            <button type="button" className="btn tag-input-btn" onClick={addSkillTag}>Add</button>
          </div>
          {form.required_skills && (
            <div className="job-tags" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {form.required_skills.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeSkillTag(tag)} style={{ marginLeft: 4, background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}>×</button>
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

        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Saving…" : editingId ? "Save changes" : "Post job"}
        </button>
      </form>
    </div>
  );
}
