import { getSupabase } from "./supabase.js";
import { profileSummary } from "./utils.js";

// ── Users ──────────────────────────────────────────────

export async function findUserByEmail(email) {
  const { data } = await getSupabase().from("users").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

export async function findUserById(id) {
  const { data } = await getSupabase()
    .from("users")
    .select("id, name, email, role, profile, email_verified, created_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function createUser({ name, email, password, role }) {
  const { data, error } = await getSupabase()
    .from("users")
    .insert({ name: name.trim(), email: email.toLowerCase(), password, role })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserPassword(userId, hashedPassword) {
  const { error } = await getSupabase().from("users").update({ password: hashedPassword }).eq("id", userId);
  if (error) throw error;
}

export async function updateUserProfile(userId, profile) {
  const { error } = await getSupabase().from("users").update({ profile }).eq("id", userId);
  if (error) throw error;
}

// ── Companies ──────────────────────────────────────────

export async function findCompanyById(id) {
  const { data } = await getSupabase().from("companies").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function findCompanyByRecruiterId(recruiterId) {
  const { data } = await getSupabase().from("companies").select("*").eq("recruiter_id", recruiterId).maybeSingle();
  return data;
}

export async function createCompany({ name, location, type, description, website, size, recruiterId }) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("companies")
    .insert({ name, location, type, description, website: website || "", size: size || "", recruiter_id: recruiterId, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompany(id, { name, location, type, description, website, size }) {
  const { data, error } = await getSupabase()
    .from("companies")
    .update({ name, location, type, description, website: website || "", size: size || "", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCompanies({ q, page, limit }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = getSupabase()
    .from("companies")
    .select("*", { count: "exact" })
    .order("id", { ascending: false });

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`name.ilike.${pattern},location.ilike.${pattern},type.ilike.${pattern}`);
  }

  query = query.range(from, to);

  const { data: companies, count } = await query;

  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (c) => {
      const { count } = await getSupabase()
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("company_id", c.id);
      return { ...c, jobCount: count || 0 };
    })
  );

  return { companies: companiesWithCounts, total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
}

export async function getCompanyJobCount(companyId) {
  const { count } = await getSupabase()
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);
  return count || 0;
}

// ── Jobs ───────────────────────────────────────────────

export async function findJobById(id) {
  const { data } = await getSupabase().from("jobs").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listJobs({ q, companyId, page, limit }) {
  let query = getSupabase()
    .from("jobs")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("id", { ascending: false });

  if (companyId) query = query.eq("company_id", companyId);

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`title.ilike.${pattern},company_name.ilike.${pattern},location.ilike.${pattern}`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: jobs, count } = await query;

  const enriched = await Promise.all(
    (jobs || []).map(async (j) => {
      const company = j.company_id ? await findCompanyById(j.company_id) : null;
      const { count: appCount } = await getSupabase()
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("job_id", j.id);
      return {
        ...j,
        company: company
          ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
          : { id: null, name: j.company_name, location: j.location, type: null, description: "", website: "", size: "" },
        applicantCount: appCount || 0,
      };
    })
  );

  return { jobs: enriched, total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
}

export async function listJobsByRecruiter(recruiterId) {
  const { data: jobs } = await getSupabase()
    .from("jobs")
    .select("*")
    .eq("recruiter_id", recruiterId)
    .order("id", { ascending: false });

  return Promise.all(
    (jobs || []).map(async (j) => {
      const company = j.company_id ? await findCompanyById(j.company_id) : null;
      const { count: appCount } = await getSupabase()
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("job_id", j.id);
      return {
        ...j,
        company: company
          ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
          : { id: null, name: j.company_name, location: j.location, type: null, description: "", website: "", size: "" },
        applicantCount: appCount || 0,
      };
    })
  );
}

export async function createJob({ title, companyId, companyName, location, type, mode, salary, description, requirements, recruiterId, recruiterName }) {
  const { data, error } = await getSupabase()
    .from("jobs")
    .insert({
      title, company_id: companyId, company_name: companyName, location,
      type: type || "Full-time", mode: mode || "On-site",
      salary: salary || "", description, requirements: requirements || "",
      recruiter_id: recruiterId, recruiter_name: recruiterName, is_active: true,
    })
    .select()
    .single();
  if (error) throw error;

  const company = companyId ? await findCompanyById(companyId) : null;
  const { count: appCount } = await getSupabase()
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("job_id", data.id);

  return {
    ...data,
    company: company
      ? { id: company.id, name: company.name, location: company.location, type: company.type, description: company.description, website: company.website, size: company.size }
      : { id: null, name: companyName, location, type: null, description: "", website: "", size: "" },
    applicantCount: appCount || 0,
  };
}

export async function updateJob(id, { title, companyId, companyName, location, type, mode, salary, description, requirements }) {
  const { data, error } = await getSupabase()
    .from("jobs")
    .update({ title, company_id: companyId, company_name: companyName, location, type, mode, salary: salary || "", description, requirements: requirements || "" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleJobActive(id) {
  const job = await findJobById(id);
  if (!job) return null;
  const { data, error } = await getSupabase()
    .from("jobs")
    .update({ is_active: !job.is_active })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJob(id) {
  await getSupabase().from("jobs").delete().eq("id", id);
}

// ── Applications ───────────────────────────────────────

export async function findApplication(jobId, seekerId) {
  const { data } = await getSupabase()
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .eq("seeker_id", seekerId)
    .maybeSingle();
  return data;
}

export async function findApplicationsByJobId(jobId) {
  const { data } = await getSupabase()
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .order("id", { ascending: false });
  return data || [];
}

export async function findApplicationsBySeekerId(seekerId) {
  const { data: apps } = await getSupabase()
    .from("applications")
    .select("*")
    .eq("seeker_id", seekerId)
    .order("id", { ascending: false });

  return Promise.all(
    (apps || []).map(async (a) => {
      const job = await findJobById(a.job_id);
      if (!job) return { ...a, job: null };
      const comp = job.company_id ? await findCompanyById(job.company_id) : null;
      return {
        ...a,
        job: {
          id: job.id, title: job.title, company_id: job.company_id, company_name: job.company_name,
          location: job.location, recruiter_id: job.recruiter_id,
          ...(comp ? { company: { id: comp.id, name: comp.name, location: comp.location, type: comp.type } } : {}),
        },
      };
    })
  );
}

export async function getAppliedJobIds(seekerId) {
  const { data } = await getSupabase()
    .from("applications")
    .select("job_id")
    .eq("seeker_id", seekerId);
  return (data || []).map((a) => a.job_id);
}

export async function createApplication({ jobId, seekerId, name, email, note }) {
  const { data, error } = await getSupabase()
    .from("applications")
    .insert({ job_id: jobId, seeker_id: seekerId, name, email, note: note || "", status: "applied" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateApplicationStatus(id, status) {
  const { data, error } = await getSupabase()
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getApplicantDetails(jobId) {
  const { data: apps } = await getSupabase()
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .order("id", { ascending: false });

  return Promise.all(
    (apps || []).map(async (a) => {
      const seeker = await findUserById(a.seeker_id);
      const profile = seeker?.profile || {};
      const resume = profile.resume
        ? { name: profile.resume.name, mimeType: profile.resume.mimeType, size: profile.resume.size, uploadedAt: profile.resume.uploadedAt }
        : null;
      return {
        ...a,
        seekerProfile: {
          headline: profile.headline || "", location: profile.location || "",
          skills: profile.skills || [], experience: profile.experience || "",
          bio: profile.bio || "", linkedin: profile.linkedin || "", resume,
        },
      };
    })
  );
}

export async function getShortlistedByCompany(companyId) {
  const { data: jobs } = await getSupabase()
    .from("jobs")
    .select("id")
    .eq("company_id", companyId);

  if (!jobs || jobs.length === 0) return [];

  const jobIds = jobs.map((j) => j.id);

  const { data: apps } = await getSupabase()
    .from("applications")
    .select("*")
    .in("job_id", jobIds)
    .in("status", ["shortlisted", "accepted"]);

  return Promise.all(
    (apps || []).map(async (a) => {
      const seeker = await findUserById(a.seeker_id);
      if (!seeker) return null;
      const profile = seeker.profile || {};
      const job = await findJobById(a.job_id);
      return {
        id: seeker.id,
        name: seeker.name,
        headline: profile.headline || "",
        location: profile.location || "",
        skills: profile.skills || [],
        bio: profile.bio || "",
        status: a.status,
        jobTitle: job?.title || "Deleted posting",
      };
    })
  );
}

// ── Conversations ──────────────────────────────────────

export async function findConversation(jobId, userA, userB) {
  const { data } = await getSupabase()
    .from("conversations")
    .select("*")
    .eq("job_id", jobId)
    .or(`and(recruiter_id.eq.${userA},seeker_id.eq.${userB}),and(recruiter_id.eq.${userB},seeker_id.eq.${userA})`)
    .maybeSingle();
  return data;
}

export async function findConversationById(id) {
  const { data } = await getSupabase().from("conversations").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function createConversation({ jobId, recruiterId, seekerId }) {
  const { data, error } = await getSupabase()
    .from("conversations")
    .insert({ job_id: jobId, recruiter_id: recruiterId, seeker_id: seekerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversationLastMessage(id, sentAt) {
  await getSupabase().from("conversations").update({ last_message_at: sentAt }).eq("id", id);
}

export async function findConversationsByUserId(userId) {
  const { data: convs } = await getSupabase()
    .from("conversations")
    .select("*")
    .or(`recruiter_id.eq.${userId},seeker_id.eq.${userId}`);

  return Promise.all(
    (convs || []).map(async (c) => {
      const otherId = c.recruiter_id === userId ? c.seeker_id : c.recruiter_id;
      const other = await findUserById(otherId);
      const job = await findJobById(c.job_id);
      const { data: msgs } = await getSupabase()
        .from("messages")
        .select("*")
        .eq("conversation_id", c.id)
        .order("id", { ascending: true });
      const last = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const unread = (msgs || []).filter((m) => m.sender_id !== userId && !m.read).length;

      return {
        ...c,
        other: other ? { id: other.id, name: other.name, role: other.role, profile: profileSummary(other) } : null,
        jobTitle: job?.title || "Deleted posting",
        jobCompany: job?.company_name || "",
        lastMessage: last ? last.body : "",
        lastMessageAt: last ? last.sent_at : c.created_at,
        unread,
      };
    })
  );
}

export async function findMessagesByConversationId(convId) {
  const { data } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("sent_at", { ascending: true });
  return data || [];
}

export async function createMessage({ conversationId, senderId, body }) {
  const { data, error } = await getSupabase()
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markMessagesRead(convId, userId) {
  await getSupabase()
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", convId)
    .neq("sender_id", userId)
    .eq("read", false);
}

export async function deleteMessagesByConversationIds(convIds) {
  if (!convIds.length) return;
  await getSupabase().from("messages").delete().in("conversation_id", convIds);
}

export async function deleteConversationsByJobId(jobId) {
  const { data: convs } = await getSupabase().from("conversations").select("id").eq("job_id", jobId);
  const convIds = (convs || []).map((c) => c.id);
  if (convIds.length) {
    await deleteMessagesByConversationIds(convIds);
    await getSupabase().from("conversations").delete().in("id", convIds);
  }
}

// ── Notifications ──────────────────────────────────────

export async function pushNotification({ userId, type, message, link }) {
  await getSupabase().from("notifications").insert({ user_id: userId, type, message, link: link || null });
}

export async function findNotificationsByUserId(userId) {
  const { data } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(30);
  return data || [];
}

export async function countUnreadNotifications(userId) {
  const { count } = await getSupabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count || 0;
}

export async function markNotificationRead(id, userId) {
  await getSupabase().from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
}

export async function markAllNotificationsRead(userId) {
  await getSupabase().from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

// ── Password Resets ────────────────────────────────────

export async function createPasswordReset(userId, token, expiresAt) {
  await getSupabase().from("password_resets").insert({ user_id: userId, token, expires_at: expiresAt });
}

export async function findPasswordReset(token) {
  const { data } = await getSupabase()
    .from("password_resets")
    .select("*")
    .eq("token", token)
    .gt("expires_at", Date.now())
    .maybeSingle();
  if (!data) {
    await getSupabase().from("password_resets").delete().lt("expires_at", Date.now());
  }
  return data;
}

export async function deletePasswordReset(token) {
  await getSupabase().from("password_resets").delete().eq("token", token);
}

export async function cleanExpiredResets() {
  await getSupabase().from("password_resets").delete().lt("expires_at", Date.now());
}
