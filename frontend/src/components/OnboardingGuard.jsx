import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function onboardStep(user, company) {
  if (!user) return null;
  if (!user.email_verified) return "verify-email";
  if (user.role === "recruiter" && !company) return "register-company";
  const p = user.profile || {};
  if (!p.headline || (user.role === "seeker" && (!p.skills || p.skills.length === 0))) return "profile";
  return null;
}

export default function OnboardingGuard({ children }) {
  const { user, company, ready } = useAuth();
  if (!ready) return null;
  if (!user) return children;

  const step = onboardStep(user, company);
  if (step === "verify-email") return <Navigate to="/verify-email" replace />;
  if (step === "register-company") return <Navigate to="/register-company" replace />;
  if (step === "profile") return <Navigate to="/profile" replace />;
  return children;
}
