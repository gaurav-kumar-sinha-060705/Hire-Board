import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

export default function Navbar() {
  const { user, token, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  function isActive(path) {
    return location.pathname === path ? "nav-link active" : "nav-link";
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  useEffect(() => {
    if (!user || !token) return;
    const interval = setInterval(() => {
      api.myNotifications(token).then((d) => setUnread(d.unread)).catch(() => {});
    }, 15000);
    api.myNotifications(token).then((d) => setUnread(d.unread)).catch(() => {});
    return () => clearInterval(interval);
  }, [user, token]);

  useEffect(() => {
    if (!notifOpen || !token) return;
    api.myNotifications(token).then((d) => {
      setNotifs(d.notifications);
      setUnread(d.unread);
    }).catch(() => {});
  }, [notifOpen, token]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarkAllRead() {
    try {
      await api.markAllNotifsRead(token);
      setNotifs((list) => list.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  }

  async function handleNotifClick(n) {
    if (!n.read) {
      try {
        await api.markNotifRead(n.id, token);
        setUnread((u) => Math.max(0, u - 1));
        setNotifs((list) => list.map((x) => x.id === n.id ? { ...x, read: true } : x));
      } catch {}
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">Hire Board</Link>
        <div className="nav-links">
          <Link className={isActive("/")} to="/">Browse Jobs</Link>
          <Link className={isActive("/companies")} to="/companies">Companies</Link>
          {user?.role === "recruiter" && (
            <Link className={isActive("/my-jobs")} to="/my-jobs">My Postings</Link>
          )}
          {user?.role === "seeker" && (
            <Link className={isActive("/applications")} to="/applications">Applications</Link>
          )}
          {user && (
            <Link className={isActive("/messages")} to="/messages">Messages</Link>
          )}
          {user && (
            <>
              <span className="notif-bell" ref={notifRef}>
                <span className="nav-link" onClick={() => setNotifOpen((o) => !o)} style={{ cursor: "pointer" }}>Alerts</span>
                {unread > 0 && <span className="notif-dot" />}
                {notifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-head">
                      <span className="notif-head-title">Notifications</span>
                      {unread > 0 && (
                        <button className="notif-mark-read" onClick={handleMarkAllRead}>Mark all read</button>
                      )}
                    </div>
                    {notifs.length === 0 && <div className="notif-empty">No notifications yet.</div>}
                    {notifs.map((n) => (
                      <button key={n.id} className={`notif-item${n.read ? "" : " notif-item-unread"}`} onClick={() => handleNotifClick(n)}>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                )}
              </span>
              <span className="nav-avatar-wrap" ref={menuRef}>
                <button className="nav-avatar" onClick={() => setMenuOpen((o) => !o)}>{initial}</button>
                {menuOpen && (
                  <div className="nav-avatar-dropdown">
                    <div className="nav-avatar-header">
                      <span className="nav-avatar-name">{user.name}</span>
                      <span className="nav-avatar-role">{user.role}</span>
                    </div>
                    <div className="nav-avatar-divider" />
                    <button className="nav-avatar-item" onClick={() => { setMenuOpen(false); navigate("/profile"); }}>Profile</button>
                    {user.role === "recruiter" && company && (
                      <button className="nav-avatar-item" onClick={() => { setMenuOpen(false); navigate(`/company/${company.id}`); }}>Company</button>
                    )}
                    {user.role === "recruiter" && !company && (
                      <button className="nav-avatar-item" onClick={() => { setMenuOpen(false); navigate("/register-company"); }}>Register Company</button>
                    )}
                    {user.role === "recruiter" && (
                      <button className="nav-avatar-item" onClick={() => { setMenuOpen(false); navigate("/post"); }}>Post a Job</button>
                    )}
                    <div className="nav-avatar-divider" />
                    <button className="nav-avatar-item nav-avatar-danger" onClick={() => { setMenuOpen(false); handleLogout(); }}>Sign out</button>
                  </div>
                )}
              </span>
            </>
          )}
          {!user && (
            <Link className="nav-link" to="/login">Sign in</Link>
          )}
        </div>
      </div>
    </div>
  );
}
