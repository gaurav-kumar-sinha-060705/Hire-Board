import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("hb_token") || null);
  const [company, setCompany] = useState(null);
  const [ready, setReady] = useState(false);

  const fetchCompany = useCallback(async (t) => {
    if (!t || !user || user.role !== "recruiter") {
      setCompany(null);
      return;
    }
    try {
      const data = await api.getMyCompany(t);
      setCompany(data.company);
    } catch {
      setCompany(null);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }
    api
      .me(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem("hb_token");
      })
      .finally(() => setReady(true));
  }, [token]);

  useEffect(() => {
    if (ready && token && user?.role === "recruiter") {
      fetchCompany(token);
    } else {
      setCompany(null);
    }
  }, [ready, token, user?.role, fetchCompany]);

  function onAuthed({ token: t, user: u }) {
    localStorage.setItem("hb_token", t);
    setToken(t);
    setUser(u);
  }

  async function register(payload) {
    const data = await api.register(payload);
    onAuthed(data);
    return data.user;
  }

  async function login(payload) {
    const data = await api.login(payload);
    onAuthed(data);
    return data.user;
  }

  async function refreshUser() {
    if (!token) return null;
    const data = await api.me(token);
    setUser(data.user);
    return data.user;
  }

  async function refreshCompany() {
    if (!token) return null;
    try {
      const data = await api.getMyCompany(token);
      setCompany(data.company);
      return data.company;
    } catch {
      setCompany(null);
      return null;
    }
  }

  function logout() {
    localStorage.removeItem("hb_token");
    setToken(null);
    setUser(null);
    setCompany(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, company, ready, register, login, refreshUser, refreshCompany, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
