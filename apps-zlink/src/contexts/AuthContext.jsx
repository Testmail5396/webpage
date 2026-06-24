import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { api } from "../lib/catalyst";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/* ── Allowed email domain ── */
const ALLOWED_DOMAIN = "zohocorp.com";

export function isValidDomain(email) {
  return email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
}

/* ── localStorage keys ── */
const AUTH_KEY         = "designfolio_auth";
const ZOHO_SESSION_KEY = "zoho_browser_session";
const SIGNOFF_KEY      = "designfolio_signoff";

function loadSession() {
  try { const raw = localStorage.getItem(AUTH_KEY); if (raw) return JSON.parse(raw); } catch {}
  return null;
}
function saveSession(s) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(s)); } catch {}
}
function clearSession() {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}
function loadZohoSession() {
  try { const raw = localStorage.getItem(ZOHO_SESSION_KEY); if (raw) return JSON.parse(raw); } catch {}
  return null;
}
function saveZohoSession(s) {
  try { localStorage.setItem(ZOHO_SESSION_KEY, JSON.stringify(s)); } catch {}
}
function markExplicitSignoff() {
  try { localStorage.setItem(SIGNOFF_KEY, "true"); } catch {}
}
function clearExplicitSignoff() {
  try { localStorage.removeItem(SIGNOFF_KEY); } catch {}
}

/* ── Avatar helpers ── */
function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
const AVATAR_COLORS = [
  "bg-violet-500","bg-rose-500","bg-blue-500","bg-emerald-500",
  "bg-amber-500","bg-cyan-500","bg-pink-500","bg-indigo-500",
];

/* ═══════════════════════════════════════════════════════
   AUTH PROVIDER — Catalyst only (no demo / mock data)
   ═══════════════════════════════════════════════════════ */

export function AuthProvider({ children }) {
  const [zohoSession, setZohoSession] = useState(() => loadZohoSession());
  const [session, setSession] = useState(() => {
    const saved = loadSession();
    if (saved && !saved.catalyst) {
      clearSession();
      return null;
    }
    return saved;
  });

  /* ── Catalyst auto-login: call getMe on mount ── */
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (session) { setAuthLoading(false); return; }

    api.getMe()
      .then(profile => {
        const newSession = {
          userId: profile.id,
          designerId: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          loginAt: new Date().toISOString(),
          zoho: true,
          catalyst: true,
        };
        setSession(newSession);
        saveSession(newSession);

        const zohoData = { email: profile.email, name: profile.name };
        saveZohoSession(zohoData);
        setZohoSession(zohoData);
        clearExplicitSignoff();
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const authUser = useMemo(() => {
    if (!session) return null;
    return {
      id: session.userId,
      designerId: session.designerId || session.userId,
      email: session.email,
      name: session.name,
      role: session.role || "Designer",
      avatar: session.name ? initials(session.name) : "U",
      avatarColor: AVATAR_COLORS[0],
    };
  }, [session]);

  /* ── Login with Zoho (Catalyst path) ── */
  const loginWithZoho = useCallback(async ({ email, name } = {}, inviteToken) => {
    try {
      const profile = await api.getMe();
      const newSession = {
        userId: profile.id,
        designerId: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        loginAt: new Date().toISOString(),
        zoho: true,
        catalyst: true,
      };
      setSession(newSession);
      saveSession(newSession);

      const zohoData = { email: profile.email, name: profile.name };
      saveZohoSession(zohoData);
      setZohoSession(zohoData);
      clearExplicitSignoff();

      return { ok: true, isNew: false };
    } catch (e) {
      return { ok: false, error: e.message || "Failed to connect" };
    }
  }, []);

  /* ── Open login: any email, any name ── */
  const loginOpen = useCallback(({ email, name } = {}) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return { ok: false, error: "Enter a valid email address" };
    }
    if (!cleanName) {
      return { ok: false, error: "Enter your name" };
    }
    const userId = "user_" + cleanEmail.replace(/[^a-z0-9]/g, "_");
    const newSession = {
      userId,
      designerId: userId,
      email: cleanEmail,
      name: cleanName,
      role: "Designer",
      loginAt: new Date().toISOString(),
      zoho: false,
      catalyst: false,
    };
    setSession(newSession);
    saveSession(newSession);
    clearExplicitSignoff();
    return { ok: true };
  }, []);

  /* ── Stubs for demo-only features (keeps UI contracts intact) ── */
  const login = useCallback((email, password) => {
    return { ok: false, error: "Use Zoho SSO to sign in" };
  }, []);

  const signup = useCallback(({ name, email, password, role, inviteToken } = {}) => {
    return { ok: false, error: "Use Zoho SSO to sign in" };
  }, []);

  const updateProfile = useCallback(({ name, role }) => {}, []);

  const logout = useCallback(() => {
    setSession(null);
    clearSession();
    markExplicitSignoff();
  }, []);

  const invite = useCallback((email) => {
    return { ok: false, error: "Invites are managed through Zoho" };
  }, []);
  const getPendingInvites = useCallback(() => [], []);
  const findInvite = useCallback((token) => null, []);

  const value = {
    authUser,
    isAuthenticated: !!authUser,
    authLoading,
    login,
    loginWithZoho,
    loginOpen,
    signup,
    logout,
    updateProfile,
    invite,
    getPendingInvites,
    findInvite,
    ALLOWED_DOMAIN,
    zohoSession,
    zohoHasAccount: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
