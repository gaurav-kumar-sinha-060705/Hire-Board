import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const cardStyle = {
  border: "1px solid var(--gray-300)",
  borderRadius: "4px",
  padding: "20px",
  marginBottom: "12px",
  background: "var(--white)",
};

const repeaterLabelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--gray-500)",
  marginBottom: "8px",
};

const ALLOWED_RESUME_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const PROFICIENCY_OPTIONS = [
  "Elementary",
  "Limited Professional",
  "Professional",
  "Full Professional",
  "Native",
];

export default function Profile() {
  const { user, token, company, refreshUser, setUser } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const profile = user?.profile || {};
  const resume = profile.resume || null;
  const isRecruiter = user?.role === "recruiter";

  const [form, setForm] = useState({
    headline: profile.headline || "",
    company: profile.company || (isRecruiter ? company?.name || "" : ""),
    location: profile.location || "",
    skills: (profile.skills || []).join(", "),
    experience: profile.experience || "",
    bio: profile.bio || "",
    linkedin: profile.linkedin || "",
    phone: user?.phone || "",
    portfolio_url: user?.portfolio_url || "",
    avatar: user?.avatar || "",
    education: user?.education || [],
    work_experience: user?.work_experience || [],
    certifications: user?.certifications || [],
    languages: user?.languages || [],
    job_preferences: user?.job_preferences || {
      jobTypes: [],
      workMode: [],
      salaryMin: "",
      salaryMax: "",
      locations: "",
    },
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateJobPref(key, value) {
    setForm((f) => ({
      ...f,
      job_preferences: { ...f.job_preferences, [key]: value },
    }));
  }

  function toggleJobPrefArray(key, value) {
    setForm((f) => {
      const arr = f.job_preferences[key] || [];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...f, job_preferences: { ...f.job_preferences, [key]: next } };
    });
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar must be under 2 MB.");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Avatar must be a JPG or PNG image.");
      e.target.value = "";
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => update("avatar", reader.result);
    reader.readAsDataURL(file);
  }

  function addEducation() {
    setForm((f) => ({
      ...f,
      education: [
        ...f.education,
        { school: "", degree: "", field: "", startYear: "", endYear: "", grade: "" },
      ],
    }));
  }

  function removeEducation(idx) {
    setForm((f) => ({
      ...f,
      education: f.education.filter((_, i) => i !== idx),
    }));
  }

  function updateEducation(idx, key, value) {
    setForm((f) => ({
      ...f,
      education: f.education.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    }));
  }

  function addWorkExperience() {
    setForm((f) => ({
      ...f,
      work_experience: [
        ...f.work_experience,
        { company: "", title: "", startDate: "", endDate: "", current: false, description: "" },
      ],
    }));
  }

  function removeWorkExperience(idx) {
    setForm((f) => ({
      ...f,
      work_experience: f.work_experience.filter((_, i) => i !== idx),
    }));
  }

  function updateWorkExperience(idx, key, value) {
    setForm((f) => ({
      ...f,
      work_experience: f.work_experience.map((w, i) =>
        i === idx ? { ...w, [key]: value } : w
      ),
    }));
  }

  function addCertification() {
    setForm((f) => ({
      ...f,
      certifications: [...f.certifications, { name: "", issuer: "", date: "", url: "" }],
    }));
  }

  function removeCertification(idx) {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.filter((_, i) => i !== idx),
    }));
  }

  function updateCertification(idx, key, value) {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.map((c, i) =>
        i === idx ? { ...c, [key]: value } : c
      ),
    }));
  }

  function addLanguage() {
    setForm((f) => ({
      ...f,
      languages: [...f.languages, { language: "", proficiency: "Professional" }],
    }));
  }

  function removeLanguage(idx) {
    setForm((f) => ({
      ...f,
      languages: f.languages.filter((_, i) => i !== idx),
    }));
  }

  function updateLanguage(idx, key, value) {
    setForm((f) => ({
      ...f,
      languages: f.languages.map((l, i) => (i === idx ? { ...l, [key]: value } : l)),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const prefsLocations =
        typeof form.job_preferences.locations === "string"
          ? form.job_preferences.locations
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : form.job_preferences.locations;

      const res = await api.updateProfile(
        {
          headline: form.headline,
          company: isRecruiter ? company?.name || "" : form.company,
          location: form.location,
          skills: form.skills.split(","),
          experience: form.experience,
          bio: form.bio,
          linkedin: form.linkedin,
          phone: form.phone,
          portfolio_url: form.portfolio_url,
          avatar: form.avatar,
          education: form.education,
          work_experience: form.work_experience,
          certifications: form.certifications,
          languages: form.languages,
          job_preferences: {
            ...form.job_preferences,
            locations: prefsLocations,
          },
        },
        token
      );
      if (res?.user) setUser(res.user);
      await refreshUser();
      showToast("Profile saved.");
      if (isRecruiter) navigate("/post", { replace: true });
      else navigate(-1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResumeChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_RESUME_TYPES[file.type]) {
      setError("Resume must be a PDF, Word document, or text file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError("Resume must be under 2 MB.");
      e.target.value = "";
      return;
    }
    setError("");
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      await api.uploadResume({ name: file.name, mimeType: file.type, dataUrl }, token);
      await refreshUser();
      showToast("Resume uploaded.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveResume() {
    setRemoving(true);
    setError("");
    try {
      await api.removeResume(token);
      await refreshUser();
      showToast("Resume removed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className="eyebrow">Account</div>
      <h1 className="page-title">Your profile</h1>
      <p className="page-sub">
        {isRecruiter
          ? "Applicants see this when you message them."
          : "Recruiters see this when you apply to a role."}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Photo</label>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {form.avatar ? (
              <img
                src={form.avatar}
                alt="Avatar"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--gray-300)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "var(--gray-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "var(--gray-500)",
                  border: "2px solid var(--gray-300)",
                }}
              >
                ?
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleAvatarChange}
              />
              <div style={{ fontSize: "12px", color: "var(--gray-500)", marginTop: "4px" }}>
                JPG or PNG, max 2 MB
              </div>
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="p-headline">Headline</label>
            <input
              id="p-headline"
              value={form.headline}
              onChange={(e) => update("headline", e.target.value)}
              placeholder={
                isRecruiter ? "e.g. Founder, Hire Board" : "e.g. AI Engineer"
              }
            />
          </div>
          {isRecruiter && (
            <div className="field">
              <label>Company</label>
              {company ? (
                <div className="field-static">
                  <Link
                    className="job-company-link"
                    to={`/company/${company.id}`}
                  >
                    {company.name}
                  </Link>
                </div>
              ) : (
                <div className="field-static">
                  <Link className="btn link" to="/register-company">
                    Register your company
                  </Link>
                </div>
              )}
            </div>
          )}
          <div className="field">
            <label htmlFor="p-location">Location</label>
            <input
              id="p-location"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Delhi"
            />
          </div>
          <div className="field">
            <label htmlFor="p-phone">Phone</label>
            <input
              id="p-phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="p-skills">Skills (comma separated)</label>
          <input
            id="p-skills"
            value={form.skills}
            onChange={(e) => update("skills", e.target.value)}
            placeholder={isRecruiter ? "e.g. Hiring, Team building, Strategy" : "e.g. React, Node.js, SQL"}
          />
        </div>
        <div className="field">
          <label htmlFor="p-experience">Experience</label>
          <textarea
            id="p-experience"
            value={form.experience}
            onChange={(e) => update("experience", e.target.value)}
            placeholder={isRecruiter ? "Roles, leadership, accomplishments" : "Relevant roles and what you did"}
          />
        </div>
        <div className="field">
          <label htmlFor="p-bio">About you</label>
          <textarea
            id="p-bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="A short intro for recruiters"
          />
        </div>
        <div className="field">
          <label htmlFor="p-linkedin">LinkedIn (optional)</label>
          <input
            id="p-linkedin"
            value={form.linkedin}
            onChange={(e) => update("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div className="field">
          <label htmlFor="p-portfolio">Portfolio URL (optional)</label>
          <input
            id="p-portfolio"
            value={form.portfolio_url}
            onChange={(e) => update("portfolio_url", e.target.value)}
            placeholder="https://yoursite.com"
          />
        </div>

        <div style={{ marginTop: 8, marginBottom: 20 }}>
              <div className="eyebrow">Education</div>
              {form.education.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                  No education entries yet.
                </p>
              )}
              {form.education.map((edu, idx) => (
                <div key={idx} style={cardStyle}>
                  <div style={repeaterLabelStyle}>Entry {idx + 1}</div>
                  <div className="field-row-3">
                    <div className="field">
                      <label>School</label>
                      <input
                        value={edu.school}
                        onChange={(e) => updateEducation(idx, "school", e.target.value)}
                        placeholder="e.g. IIT Delhi"
                      />
                    </div>
                    <div className="field">
                      <label>Degree</label>
                      <input
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                        placeholder="e.g. B.Tech"
                      />
                    </div>
                    <div className="field">
                      <label>Field</label>
                      <input
                        value={edu.field}
                        onChange={(e) => updateEducation(idx, "field", e.target.value)}
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </div>
                  <div className="field-row-3">
                    <div className="field">
                      <label>Start Year</label>
                      <input
                        type="number"
                        value={edu.startYear}
                        onChange={(e) => updateEducation(idx, "startYear", e.target.value)}
                        placeholder="2018"
                      />
                    </div>
                    <div className="field">
                      <label>End Year</label>
                      <input
                        type="number"
                        value={edu.endYear}
                        onChange={(e) => updateEducation(idx, "endYear", e.target.value)}
                        placeholder="2022"
                      />
                    </div>
                    <div className="field">
                      <label>Grade / GPA</label>
                      <input
                        value={edu.grade}
                        onChange={(e) => updateEducation(idx, "grade", e.target.value)}
                        placeholder="e.g. 8.5 CGPA"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn small outline danger"
                    onClick={() => removeEducation(idx)}
                    style={{ marginTop: 4 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn small outline"
                onClick={addEducation}
                style={{ marginTop: 4 }}
              >
                + Add Education
              </button>
            </div>

            <div style={{ marginTop: 8, marginBottom: 20 }}>
              <div className="eyebrow">Work Experience</div>
              {form.work_experience.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                  No work experience entries yet.
                </p>
              )}
              {form.work_experience.map((work, idx) => (
                <div key={idx} style={cardStyle}>
                  <div style={repeaterLabelStyle}>Entry {idx + 1}</div>
                  <div className="field-row">
                    <div className="field">
                      <label>Company</label>
                      <input
                        value={work.company}
                        onChange={(e) => updateWorkExperience(idx, "company", e.target.value)}
                        placeholder="e.g. Google"
                      />
                    </div>
                    <div className="field">
                      <label>Title</label>
                      <input
                        value={work.title}
                        onChange={(e) => updateWorkExperience(idx, "title", e.target.value)}
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Start Date</label>
                      <input
                        type="month"
                        value={work.startDate}
                        onChange={(e) => updateWorkExperience(idx, "startDate", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>End Date</label>
                      <input
                        type="month"
                        value={work.endDate}
                        disabled={work.current}
                        onChange={(e) => updateWorkExperience(idx, "endDate", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", textTransform: "none", letterSpacing: "normal", fontSize: "13px", fontWeight: "500" }}>
                      <input
                        type="checkbox"
                        checked={work.current}
                        onChange={(e) =>
                          updateWorkExperience(idx, "current", e.target.checked)
                        }
                        style={{ width: "auto" }}
                      />
                      I currently work here
                    </label>
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea
                      value={work.description}
                      onChange={(e) => updateWorkExperience(idx, "description", e.target.value)}
                      placeholder="What you did in this role"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn small outline danger"
                    onClick={() => removeWorkExperience(idx)}
                    style={{ marginTop: 4 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn small outline"
                onClick={addWorkExperience}
                style={{ marginTop: 4 }}
              >
                + Add Work Experience
              </button>
            </div>

            <div style={{ marginTop: 8, marginBottom: 20 }}>
              <div className="eyebrow">Certifications</div>
              {form.certifications.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                  No certifications yet.
                </p>
              )}
              {form.certifications.map((cert, idx) => (
                <div key={idx} style={cardStyle}>
                  <div style={repeaterLabelStyle}>Entry {idx + 1}</div>
                  <div className="field-row">
                    <div className="field">
                      <label>Name</label>
                      <input
                        value={cert.name}
                        onChange={(e) => updateCertification(idx, "name", e.target.value)}
                        placeholder="e.g. AWS Solutions Architect"
                      />
                    </div>
                    <div className="field">
                      <label>Issuer</label>
                      <input
                        value={cert.issuer}
                        onChange={(e) => updateCertification(idx, "issuer", e.target.value)}
                        placeholder="e.g. Amazon"
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Date</label>
                      <input
                        type="month"
                        value={cert.date}
                        onChange={(e) => updateCertification(idx, "date", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>URL</label>
                      <input
                        value={cert.url}
                        onChange={(e) => updateCertification(idx, "url", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn small outline danger"
                    onClick={() => removeCertification(idx)}
                    style={{ marginTop: 4 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn small outline"
                onClick={addCertification}
                style={{ marginTop: 4 }}
              >
                + Add Certification
              </button>
            </div>

            <div style={{ marginTop: 8, marginBottom: 20 }}>
              <div className="eyebrow">Languages</div>
              {form.languages.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                  No languages added yet.
                </p>
              )}
              {form.languages.map((lang, idx) => (
                <div key={idx} style={cardStyle}>
                  <div className="field-row">
                    <div className="field">
                      <label>Language</label>
                      <input
                        value={lang.language}
                        onChange={(e) => updateLanguage(idx, "language", e.target.value)}
                        placeholder="e.g. English"
                      />
                    </div>
                    <div className="field">
                      <label>Proficiency</label>
                      <select
                        value={lang.proficiency}
                        onChange={(e) => updateLanguage(idx, "proficiency", e.target.value)}
                      >
                        {PROFICIENCY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn small outline danger"
                    onClick={() => removeLanguage(idx)}
                    style={{ marginTop: 4 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn small outline"
                onClick={addLanguage}
                style={{ marginTop: 4 }}
              >
                + Add Language
              </button>
            </div>

            <div style={{ marginTop: 8, marginBottom: 20 }}>
              <div className="eyebrow">Job Preferences</div>
              <div style={cardStyle}>
                <div className="field">
                  <label>Job Types</label>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    {["Full-time", "Part-time", "Contract", "Internship"].map((jt) => (
                      <label
                        key={jt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(form.job_preferences.jobTypes || []).includes(jt)}
                          onChange={() => toggleJobPrefArray("jobTypes", jt)}
                          style={{ width: "auto" }}
                        />
                        {jt}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Work Mode</label>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    {["On-site", "Remote", "Hybrid"].map((wm) => (
                      <label
                        key={wm}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(form.job_preferences.workMode || []).includes(wm)}
                          onChange={() => toggleJobPrefArray("workMode", wm)}
                          style={{ width: "auto" }}
                        />
                        {wm}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Min Salary</label>
                    <input
                      type="number"
                      value={form.job_preferences.salaryMin}
                      onChange={(e) => updateJobPref("salaryMin", e.target.value)}
                      placeholder="e.g. 500000"
                    />
                  </div>
                  <div className="field">
                    <label>Max Salary</label>
                    <input
                      type="number"
                      value={form.job_preferences.salaryMax}
                      onChange={(e) => updateJobPref("salaryMax", e.target.value)}
                      placeholder="e.g. 1500000"
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Preferred Locations</label>
                  <input
                    value={
                      typeof form.job_preferences.locations === "string"
                        ? form.job_preferences.locations
                        : (form.job_preferences.locations || []).join(", ")
                    }
                    onChange={(e) => updateJobPref("locations", e.target.value)}
                    placeholder="e.g. Delhi, Bangalore, Remote"
                  />
                </div>
              </div>
            </div>

        {error && <div className="error-text">{error}</div>}
        <button
          className="btn"
          type="submit"
          disabled={saving}
          style={{ marginTop: 8 }}
        >
          {saving ? "Saving\u2026" : "Save profile"}
        </button>
      </form>

      <div className="panel" style={{ marginTop: 32 }}>
          <div className="eyebrow">Document</div>
          <h2 className="page-title" style={{ fontSize: 20 }}>
            Resume
          </h2>
          <p className="page-sub">
            PDF, Word, or plain text, up to 2 MB.
          </p>

          {resume ? (
            <div className="resume-row">
              <div>
                <div className="applicant-name">{resume.name}</div>
                <div className="resume-meta">
                  {resume.mimeType === "application/pdf"
                    ? "PDF"
                    : resume.mimeType === "application/msword"
                    ? "DOC"
                    : resume.mimeType.includes("wordprocessingml")
                    ? "DOCX"
                    : "TXT"}{" "}
                  &middot; {formatBytes(resume.size)} &middot; uploaded{" "}
                  {new Date(resume.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="job-actions">
                <a
                  className="btn small outline"
                  href={resume.dataUrl}
                  download={resume.name}
                >
                  Download
                </a>
                <button
                  className="btn small outline danger"
                  onClick={handleRemoveResume}
                  disabled={removing}
                >
                  {removing ? "Removing\u2026" : "Remove"}
                </button>
              </div>
            </div>
          ) : (
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="p-resume">Upload resume</label>
              <input
                id="p-resume"
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleResumeChange}
                disabled={uploading}
              />
            </div>
          )}
        </div>
    </div>
  );
}
