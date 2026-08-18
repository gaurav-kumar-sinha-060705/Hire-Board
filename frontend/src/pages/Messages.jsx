import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString();
}

export default function Messages() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newConvJob, setNewConvJob] = useState(null);
  const [newConvOther, setNewConvOther] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(true);
  const threadEndRef = useRef(null);

  async function loadConversations() {
    try {
      const data = await api.myConversations(token);
      setConversations(data.conversations);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openById(conv) {
    try {
      const data = await api.conversationMessages(conv.id, token);
      setThread(data.conversation);
      setMessages(data.messages);
      setNewConvJob(null);
      setNewConvOther(null);
      setShowList(false);
      setError("");
      loadConversations();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openByPair(jobId, withId) {
    try {
      const data = await api.openThread(jobId, withId, token);
      setThread(data.conversation);
      setMessages(data.conversation ? data.messages : []);
      setNewConvJob(data.conversation ? null : data.job);
      setNewConvOther(data.conversation ? null : data.recipient);
      setShowList(false);
      setError("");
      loadConversations();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadConversations();
    const jobId = searchParams.get("job");
    const withId = searchParams.get("with");
    if (jobId && withId) openByPair(jobId, withId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => {
      if (thread) {
        api.conversationMessages(thread.id, token).then((data) => {
          setMessages(data.messages);
          setThread(data.conversation);
        }).catch(() => {});
      }
      loadConversations();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, token]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const payload = thread
        ? { conversationId: thread.id, body: draft }
        : { jobId: newConvJob.id, recipientId: newConvOther.id, body: draft };
      const data = await api.sendMessage(payload, token);
      if (!thread) {
        setThread(data.conversation);
      }
      setMessages((m) => [...m, data.message]);
      setDraft("");
      loadConversations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function closeThread() {
    setThread(null);
    setMessages([]);
    setNewConvJob(null);
    setNewConvOther(null);
    setShowList(true);
    setSearchParams({}, { replace: true });
  }

  if (!user) return null;

  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);
  const threadOther = thread ? thread.other : newConvJob ? newConvOther : null;
  const otherProfileLine = threadOther?.profile
    ? [threadOther.profile.headline, threadOther.profile.company, threadOther.profile.location].filter(Boolean).join(" · ")
    : "";

  return (
    <div>
      <div className="eyebrow">Inbox</div>
      <h1 className="page-title">Messages</h1>
      <p className="page-sub">Chat with recruiters and applicants about your roles.</p>

      <div className="inbox">
        <aside className={`inbox-list ${showList ? "inbox-list-open" : ""}`}>
          <div className="inbox-list-head">
            <span>Conversations</span>
            {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
          </div>

          {conversations.length === 0 && (
            <div className="inbox-empty">No conversations yet. Start one from a job you've posted or applied to.</div>
          )}

          {conversations.map((c) => (
            <button
              key={c.id}
              className={`conv-row ${thread?.id === c.id ? "conv-row-active" : ""} ${c.unread ? "conv-row-unread" : ""}`}
              onClick={() => (thread?.id === c.id ? closeThread() : openById(c))}
            >
              <div className="conv-row-top">
                <span className="conv-name">{c.other.name}</span>
                <span className="conv-time">{timeLabel(c.lastMessageAt)}</span>
              </div>
              <div className="conv-job">{c.jobTitle}{c.jobCompany ? ` · ${c.jobCompany}` : ""}</div>
              <div className="conv-row-bottom">
                <span className="conv-preview">{c.lastMessage || "Say hello."}</span>
                {c.unread > 0 && <span className="badge">{c.unread}</span>}
              </div>
            </button>
          ))}
        </aside>

        <section className={`inbox-thread ${!showList ? "inbox-thread-open" : ""}`}>
          {thread || newConvJob ? (
            <>
              <div className="thread-head">
                <button className="btn small outline thread-back" onClick={closeThread}>← Back</button>
                <div>
                  <div className="thread-name">
                    {thread ? thread.other.name : newConvOther.name}
                    <span className="thread-role">{thread ? thread.other.role : newConvOther.role}</span>
                  </div>
                  <div className="thread-job">{thread ? thread.jobTitle : newConvJob.title} · {thread ? thread.jobCompany : newConvJob.company}</div>
                  {otherProfileLine && <div className="thread-profile">{otherProfileLine}</div>}
                </div>
              </div>

              <div className="thread-body">
                {messages.length === 0 && (
                  <div className="inbox-empty">No messages yet. Say hello to start the conversation.</div>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`msg ${mine ? "msg-mine" : ""}`}>
                      <div className="msg-bubble">{m.body}</div>
                      <div className="msg-time">{timeLabel(m.sent_at)}</div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <form className="composer" onSubmit={handleSend}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  rows={2}
                />
                <button className="btn" type="submit" disabled={sending || !draft.trim()}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="thread-placeholder">
              {conversations.length === 0
                ? "Pick a conversation, or use the Message buttons on jobs to start one."
                : "Select a conversation to read it."}
            </div>
          )}
        </section>
      </div>

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
