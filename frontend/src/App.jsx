import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import OnboardingGuard from "./components/OnboardingGuard.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import RegisterCompany from "./pages/RegisterCompany.jsx";
import EditCompany from "./pages/EditCompany.jsx";
import BrowseJobs from "./pages/BrowseJobs.jsx";
import BrowseCompanies from "./pages/BrowseCompanies.jsx";
import Landing from "./pages/Landing.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import CompanyProfile from "./pages/CompanyProfile.jsx";
import PostJob from "./pages/PostJob.jsx";
import MyJobs from "./pages/MyJobs.jsx";
import MyApplications from "./pages/MyApplications.jsx";
import Profile from "./pages/Profile.jsx";
import Messages from "./pages/Messages.jsx";
import NotFound from "./pages/NotFound.jsx";

function RequireRole({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function LandingRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/browse" replace />;
  return <Landing />;
}

export default function App() {
  const { ready } = useAuth();
  if (!ready) return null;

  return (
    <ToastProvider>
      <Navbar />
      <div className="shell">
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/browse" element={<BrowseJobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/register-company"
            element={
              <RequireRole role="recruiter">
                <RegisterCompany />
              </RequireRole>
            }
          />
          <Route path="/company/:id" element={<CompanyProfile />} />
          <Route
            path="/edit-company"
            element={
              <RequireRole role="recruiter">
                <OnboardingGuard>
                  <EditCompany />
                </OnboardingGuard>
              </RequireRole>
            }
          />
          <Route path="/companies" element={<BrowseCompanies />} />
          <Route
            path="/post"
            element={
              <RequireRole role="recruiter">
                <OnboardingGuard>
                  <PostJob />
                </OnboardingGuard>
              </RequireRole>
            }
          />
          <Route
            path="/my-jobs"
            element={
              <RequireRole role="recruiter">
                <OnboardingGuard>
                  <MyJobs />
                </OnboardingGuard>
              </RequireRole>
            }
          />
          <Route
            path="/applications"
            element={
              <RequireRole role="seeker">
                <OnboardingGuard>
                  <MyApplications />
                </OnboardingGuard>
              </RequireRole>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireRole>
                <Profile />
              </RequireRole>
            }
          />
          <Route
            path="/messages"
            element={
              <RequireRole>
                <OnboardingGuard>
                  <Messages />
                </OnboardingGuard>
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}
