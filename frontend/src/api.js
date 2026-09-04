const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),
  verifyEmail: (payload) => request("/auth/verify-email", { method: "POST", body: payload }),
  resendOtp: (payload) => request("/auth/resend-otp", { method: "POST", body: payload }),
  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: payload }),

  createCompany: (payload, token) => request("/companies", { method: "POST", body: payload, token }),
  updateCompany: (id, payload, token) => request(`/companies/${id}`, { method: "PUT", body: payload, token }),
  getMyCompany: (token) => request("/companies/mine", { token }),
  getCompany: (id) => request(`/companies/${id}`),
  listCompanies: (page = 1, limit = 12, q = "") => {
    const params = new URLSearchParams({ page, limit });
    if (q) params.set("q", q);
    return request(`/companies?${params}`);
  },

  listJobs: (q, companyId, page = 1, limit = 12) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (companyId) params.set("companyId", companyId);
    params.set("page", page);
    params.set("limit", limit);
    return request(`/jobs?${params}`);
  },
  getJob: (jobId) => request(`/jobs/${jobId}`),
  getCompanyTeam: (companyId) => request(`/jobs/company/${companyId}/team`),
  removeTeamMember: (companyId, seekerId, token) => request(`/jobs/company/${companyId}/team/${seekerId}`, { method: "DELETE", token }),
  myJobs: (token) => request("/jobs/mine", { token }),
  myAppliedJobIds: (token) => request("/jobs/mine/applied", { token }),
  postJob: (payload, token) => request("/jobs", { method: "POST", body: payload, token }),
  updateJob: (jobId, payload, token) => request(`/jobs/${jobId}`, { method: "PUT", body: payload, token }),
  deleteJob: (jobId, token) => request(`/jobs/${jobId}`, { method: "DELETE", token }),
  toggleActiveJob: (jobId, token) => request(`/jobs/${jobId}/toggle-active`, { method: "PATCH", token }),
  applyToJob: (jobId, payload, token) => request(`/jobs/${jobId}/apply`, { method: "POST", body: payload, token }),
  applicants: (jobId, token) => request(`/jobs/${jobId}/applicants`, { token }),
  updateApplicationStatus: (jobId, appId, status, token) =>
    request(`/jobs/${jobId}/applicants/${appId}`, { method: "PATCH", body: { status }, token }),
  myApplications: (token) => request("/jobs/applications/mine", { token }),

  myConversations: (token) => request("/messages/conversations", { token }),
  openThread: (jobId, withId, token) => request(`/messages/thread?jobId=${jobId}&with=${withId}`, { token }),
  conversationMessages: (convId, token) => request(`/messages/${convId}`, { token }),
  sendMessage: (payload, token) => request("/messages", { method: "POST", body: payload, token }),

  getProfile: (userId, token) => request(`/users/${userId}`, { token }),
  updateProfile: (payload, token) => request("/users/me/profile", { method: "PUT", body: payload, token }),
  uploadResume: (payload, token) => request("/users/me/resume", { method: "POST", body: payload, token }),
  removeResume: (token) => request("/users/me/resume", { method: "DELETE", token }),

  myNotifications: (token) => request("/notifications", { token }),
  markNotifRead: (id, token) => request(`/notifications/${id}/read`, { method: "PATCH", token }),
  markAllNotifsRead: (token) => request("/notifications/read-all", { method: "PATCH", token }),

  getStats: () => request("/stats"),
};
