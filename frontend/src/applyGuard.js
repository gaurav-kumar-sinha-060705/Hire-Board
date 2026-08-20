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
    showToast("Verify your email to apply.");
    navigate("/verify-email");
    return false;
  }
  if (!user.profile?.headline || !user.profile?.skills || user.profile.skills.length === 0) {
    showToast("Complete your profile to apply.");
    navigate("/profile");
    return false;
  }
  return true;
}

export async function submitApplication(jobId, payload, token, navigate, showToast) {
  try {
    await api.applyToJob(jobId, payload, token);
    showToast("Application submitted.");
    return true;
  } catch (err) {
    if (/verify/i.test(err.message)) {
      showToast("Verify your email to apply.");
      navigate("/verify-email");
    } else if (/profile/i.test(err.message)) {
      showToast("Complete your profile to apply.");
      navigate("/profile");
    } else {
      throw err;
    }
    return false;
  }
}
