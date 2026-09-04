import { api } from "./api.js";

export function canApply(user, navigate, showToast) {
  if (!user) {
    navigate("/login");
    return false;
  }
  if (user.role !== "seeker") {
    showToast("Sign in as a job seeker to apply.");
    return false;
  }
  if (!user.email_verified) {
    return "verify";
  }
  if (!user.profile?.headline || !user.profile?.skills || user.profile.skills.length === 0) {
    return "profile";
  }
  return true;
}

export async function submitApplication(jobId, payload, token, navigate, showToast) {
  try {
    await api.applyToJob(jobId, payload, token);
    showToast("Application submitted.");
    return true;
  } catch (err) {
    if (err.message && /verify/i.test(err.message)) {
      return "verify";
    } else if (err.message && /profile/i.test(err.message)) {
      showToast("Complete your profile to apply.");
      navigate("/profile");
      return false;
    } else {
      throw err;
    }
  }
}
