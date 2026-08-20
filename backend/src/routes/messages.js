import { Router } from "express";
import {
  findUserById, findJobById, findConversation, findConversationById, createConversation,
  updateConversationLastMessage, findConversationsByUserId, findMessagesByConversationId,
  createMessage, markMessagesRead, pushNotification,
} from "../db.js";
import { getSupabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";
import { profileSummary, asyncHandler } from "../utils.js";

const router = Router();

function belongsTo(conv, userId) {
  return conv.recruiter_id === userId || conv.seeker_id === userId;
}

async function isMessagingAllowed(seekerId, job) {
  const { data } = await getSupabase()
    .from("applications")
    .select("status")
    .eq("job_id", job.id)
    .eq("seeker_id", seekerId)
    .maybeSingle();
  return data && (data.status === "shortlisted" || data.status === "accepted");
}

// GET /api/messages/conversations
router.get("/conversations", authenticate, asyncHandler(async (req, res) => {
  const list = await findConversationsByUserId(req.user.id);

  const allowed = [];
  for (const conv of list) {
    const { data: app } = await getSupabase()
      .from("applications")
      .select("status")
      .eq("job_id", conv.job_id)
      .eq("seeker_id", conv.seeker_id)
      .maybeSingle();
    if (app && (app.status === "shortlisted" || app.status === "accepted")) {
      allowed.push(conv);
    }
  }

  const enriched = await Promise.all(allowed.map(async (conv) => {
    const otherId = conv.recruiter_id === req.user.id ? conv.seeker_id : conv.recruiter_id;
    const other = await findUserById(otherId);
    return {
      ...conv,
      other: other ? { id: other.id, name: other.name, role: other.role, avatar: other.avatar || null } : null,
    };
  }));

  enriched.sort((a, b) => new Date(b.lastMessageAt || b.created_at) - new Date(a.lastMessageAt || a.created_at));
  res.json({ conversations: enriched });
}));

// GET /api/messages/thread?jobId=&with=
router.get("/thread", authenticate, asyncHandler(async (req, res) => {
  const jobId = Number(req.query.jobId);
  const withId = Number(req.query.with);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });

  const seekerId = req.user.role === "seeker" ? req.user.id : withId;
  const allowed = await isMessagingAllowed(seekerId, job);
  if (!allowed) {
    return res.status(403).json({ error: "Messaging is available after being shortlisted or accepted." });
  }

  const conv = await findConversation(jobId, req.user.id, withId);
  if (!conv) {
    const recipient = await findUserById(withId);
    return res.json({
      conversation: null,
      job: { id: job.id, title: job.title, company: job.company_name },
      recipient: recipient ? { id: recipient.id, name: recipient.name, role: recipient.role, avatar: recipient.avatar || null, profile: profileSummary(recipient) } : null,
    });
  }
  if (!belongsTo(conv, req.user.id)) return res.status(403).json({ error: "This conversation isn't yours." });

  await markMessagesRead(conv.id, req.user.id);
  const messages = await findMessagesByConversationId(conv.id);
  const otherId = conv.recruiter_id === req.user.id ? conv.seeker_id : conv.recruiter_id;
  const other = await findUserById(otherId);

  res.json({
    conversation: {
      ...conv,
      other: other ? { id: other.id, name: other.name, role: other.role, avatar: other.avatar || null, profile: profileSummary(other) } : null,
      jobTitle: job.title,
      jobCompany: job.company_name,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].body : "",
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].sent_at : conv.created_at,
      unread: messages.filter((m) => m.sender_id !== req.user.id && !m.read).length,
    },
    messages,
    job: { id: job.id, title: job.title, company: job.company_name },
  });
}));

// GET /api/messages/:id
router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const conv = await findConversationById(Number(req.params.id));
  if (!conv) return res.status(404).json({ error: "Conversation not found." });
  if (!belongsTo(conv, req.user.id)) return res.status(403).json({ error: "This conversation isn't yours." });

  await markMessagesRead(conv.id, req.user.id);
  const messages = await findMessagesByConversationId(conv.id);
  const otherId = conv.recruiter_id === req.user.id ? conv.seeker_id : conv.recruiter_id;
  const other = await findUserById(otherId);
  const job = await findJobById(conv.job_id);

  res.json({
    conversation: {
      ...conv,
      other: other ? { id: other.id, name: other.name, role: other.role, avatar: other.avatar || null, profile: profileSummary(other) } : null,
      jobTitle: job?.title || "Deleted posting",
      jobCompany: job?.company_name || "",
      lastMessage: messages.length > 0 ? messages[messages.length - 1].body : "",
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].sent_at : conv.created_at,
      unread: messages.filter((m) => m.sender_id !== req.user.id && !m.read).length,
    },
    messages,
  });
}));

// POST /api/messages
router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { conversationId, jobId, recipientId, body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: "Write a message first." });
  if (String(body).length > 5000) return res.status(400).json({ error: "Message must be under 5,000 characters." });

  let conv = conversationId ? await findConversationById(Number(conversationId)) : null;

  if (conv) {
    if (!belongsTo(conv, req.user.id)) return res.status(403).json({ error: "You aren't part of this conversation." });
  } else {
    const job = await findJobById(Number(jobId));
    if (!job) return res.status(404).json({ error: "Job not found." });

    const seekerId = req.user.role === "seeker" ? req.user.id : Number(recipientId);
    const allowed = await isMessagingAllowed(seekerId, job);
    if (!allowed) {
      return res.status(403).json({ error: "Messaging is available after being shortlisted or accepted." });
    }

    conv = await findConversation(job.id, req.user.id, Number(recipientId));
    if (!conv) {
      conv = await createConversation({
        jobId: job.id,
        recruiterId: job.recruiter_id,
        seekerId: job.recruiter_id === req.user.id ? Number(recipientId) : req.user.id,
      });
    }
  }

  const message = await createMessage({ conversationId: conv.id, senderId: req.user.id, body });
  await updateConversationLastMessage(conv.id, message.sent_at);

  const msgRecipientId = conv.recruiter_id === req.user.id ? conv.seeker_id : conv.recruiter_id;
  await pushNotification({
    userId: msgRecipientId,
    type: "message",
    message: `New message from ${req.user.name}`,
    link: `/messages`,
  });

  const otherId = conv.recruiter_id === req.user.id ? conv.seeker_id : conv.recruiter_id;
  const other = await findUserById(otherId);
  const messages = await findMessagesByConversationId(conv.id);
  const job = await findJobById(conv.job_id);

  res.status(201).json({
    conversation: {
      ...conv,
      other: other ? { id: other.id, name: other.name, role: other.role, avatar: other.avatar || null, profile: profileSummary(other) } : null,
      jobTitle: job?.title || "Deleted posting",
      jobCompany: job?.company_name || "",
      lastMessage: message.body,
      lastMessageAt: message.sent_at,
      unread: 0,
    },
    message,
  });
}));

export default router;
