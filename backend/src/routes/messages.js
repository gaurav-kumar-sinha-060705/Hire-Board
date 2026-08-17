import { Router } from "express";
import {
  findUserById, findJobById, findConversation, findConversationById, createConversation,
  updateConversationLastMessage, findConversationsByUserId, findMessagesByConversationId,
  createMessage, markMessagesRead, pushNotification,
} from "../db.js";
import { getSupabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

function profileSummary(user) {
  const p = user?.profile || {};
  return { headline: p.headline || "", company: p.company || "", location: p.location || "", bio: p.bio || "" };
}

function belongsTo(conv, userId) {
  return conv.recruiter_id === userId || conv.seeker_id === userId;
}

async function canMessagePair(sender, recipient, job) {
  if (!recipient || recipient.id === sender.id) return false;
  const seekerId = sender.role === "seeker" ? sender.id : recipient.id;
  const { count } = await getSupabase()
    .from("applications").select("*", { count: "exact", head: true })
    .eq("job_id", job.id).eq("seeker_id", seekerId);
  if (!count) return false;
  if (sender.role === "recruiter") return job.recruiter_id === sender.id && recipient.role === "seeker";
  if (sender.role === "seeker") return job.recruiter_id === recipient.id && recipient.role === "recruiter";
  return false;
}

// GET /api/messages/conversations
router.get("/conversations", authenticate, async (req, res) => {
  const list = await findConversationsByUserId(req.user.id);
  list.sort((a, b) => new Date(b.lastMessageAt || b.created_at) - new Date(a.lastMessageAt || a.created_at));
  res.json({ conversations: list });
});

// GET /api/messages/thread?jobId=&with=
router.get("/thread", authenticate, async (req, res) => {
  const jobId = Number(req.query.jobId);
  const withId = Number(req.query.with);
  const job = await findJobById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });

  const conv = await findConversation(jobId, req.user.id, withId);
  if (!conv) {
    const recipient = await findUserById(withId);
    return res.json({
      conversation: null,
      job: { id: job.id, title: job.title, company: job.company_name },
      recipient: recipient ? { id: recipient.id, name: recipient.name, role: recipient.role, profile: profileSummary(recipient) } : null,
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
      other: other ? { id: other.id, name: other.name, role: other.role, profile: profileSummary(other) } : null,
      jobTitle: job.title,
      jobCompany: job.company_name,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].body : "",
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].sent_at : conv.created_at,
      unread: messages.filter((m) => m.sender_id !== req.user.id && !m.read).length,
    },
    messages,
    job: { id: job.id, title: job.title, company: job.company_name },
  });
});

// GET /api/messages/:id
router.get("/:id", authenticate, async (req, res) => {
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
      other: other ? { id: other.id, name: other.name, role: other.role, profile: profileSummary(other) } : null,
      jobTitle: job?.title || "Deleted posting",
      jobCompany: job?.company_name || "",
      lastMessage: messages.length > 0 ? messages[messages.length - 1].body : "",
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].sent_at : conv.created_at,
      unread: messages.filter((m) => m.sender_id !== req.user.id && !m.read).length,
    },
    messages,
  });
});

// POST /api/messages
router.post("/", authenticate, async (req, res) => {
  const { conversationId, jobId, recipientId, body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: "Write a message first." });
  if (String(body).length > 5000) return res.status(400).json({ error: "Message must be under 5,000 characters." });

  let conv = conversationId ? await findConversationById(Number(conversationId)) : null;

  if (conv) {
    if (!belongsTo(conv, req.user.id)) return res.status(403).json({ error: "You aren't part of this conversation." });
  } else {
    const job = await findJobById(Number(jobId));
    if (!job) return res.status(404).json({ error: "Job not found." });
    const recipient = await findUserById(Number(recipientId));
    if (!(await canMessagePair(req.user, recipient, job))) {
      return res.status(403).json({ error: "You can only message someone connected through a job you've applied to or posted." });
    }
    conv = await findConversation(job.id, req.user.id, recipient.id);
    if (!conv) {
      conv = await createConversation({
        jobId: job.id,
        recruiterId: job.recruiter_id,
        seekerId: job.recruiter_id === req.user.id ? recipient.id : req.user.id,
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
      other: other ? { id: other.id, name: other.name, role: other.role, profile: profileSummary(other) } : null,
      jobTitle: job?.title || "Deleted posting",
      jobCompany: job?.company_name || "",
      lastMessage: message.body,
      lastMessageAt: message.sent_at,
      unread: 0,
    },
    message,
  });
});

export default router;
