import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const ALLOWED_RESUME_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
const MAX_RESUME_BYTES = 2 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function Profile() {
  const { user, token, company, refreshUser } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const profile = user?.profile || {};
  const resume = profile.resume || null;
  const isRecruiter = user?.role === "recruiter";

  const [form, setForm] = useState({
    headline: profile.headline || "",
    company: profile.company || "",
    location: profile.location || "",
    skills: (profile.skills || []).join(", "),
    experience: profile.experience || "",
    bio: profile.bio || "",
    linkedin: profile.linkedin || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.updateProfile({
        headline: form.headline,
        company: isRecruiter ? (company?.name || "") : form.company,
        location: form.location,
        skills: form.skills.split(","),
        experience: form.experience,
        bio: form.bio,
        linkedin: form.linkedin,
      }, token);
      await refreshUser();
      showToast("Profile saved.");
      navigate("/");
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
      <p className="page-sub">{isRecruiter ? "Applicants see this when you message them." : "Recruiters see this when you apply to a role."}</p>

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="p-headline">Headline</label>
            <input id="p-headline" value={form.headline} onChange={(e) => update("headline", e.target.value)} placeholder={isRecruiter ? "e.g. Founder, Hire Board" : "e.g. AI Engineer"} />
          </div>
          {isRecruiter && (
            <div className="field">
              <label>Company</label>
              {company ? (
                <div className="field-static">
                  <Link className="job-company-link" to={`/company/${company.id}`}>{company.name}</Link>
                </div>
              ) : (
                <div className="field-static">
                  <Link className="btn link" to="/register-company">Register your company</Link>
                </div>
              )}
            </div>
          )}
          <div className="field">
            <label htmlFor="p-location">Location</label>
            <input id="p-location" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Delhi" />
          </div>
        </div>
        {!isRecruiter && (
          <>
            <div className="field">
              <label htmlFor="p-skills">Skills (comma separated)</label>
              <input id="p-skills" value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="e.g. React, Node.js, SQL" />
            </div>
            <div className="field">
              <label htmlFor="p-experience">Experience</label>
              <textarea id="p-experience" value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="Relevant roles and what you did" />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="p-bio">About you</label>
          <textarea id="p-bio" value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="A short intro for recruiters" />
        </div>
        <div className="field">
          <label htmlFor="p-linkedin">LinkedIn (optional)</label>
          <input id="p-linkedin" value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" disabled={saving} style={{ marginTop: 8 }}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      {!isRecruiter && (
        <div className="panel" style={{ marginTop: 32 }}>
          <div className="eyebrow">Document</div>
          <h2 className="page-title" style={{ fontSize: 20 }}>Resume</h2>
          <p className="page-sub">PDF, Word, or plain text, up to 2 MB. Recruiters can view it once you apply.</p>

        {resume ? (
          <div className="resume-row">
            <div>
              <div className="applicant-name">{resume.name}</div>
              <div className="resume-meta">{resume.mimeType === "application/pdf" ? "PDF" : resume.mimeType === "application/msword" ? "DOC" : resume.mimeType.includes("wordprocessingml") ? "DOCX" : "TXT"} · {formatBytes(resume.size)} · uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</div>
            </div>
            <div className="job-actions">
              <a className="btn small outline" href={resume.dataUrl} download={resume.name}>Download</a>
              <button className="btn small outline danger" onClick={handleRemoveResume} disabled={removing}>
                {removing ? "Removing…" : "Remove"}
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
      )}
    </div>
  );
}
