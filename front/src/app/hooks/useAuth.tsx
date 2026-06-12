import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import {
  clearStoredSession,
  isSessionIdleExpired,
  loadStoredSession,
  logoutAuthSession,
  parseIdleMs,
  refreshAuthSession,
  REFRESH_CHECK_INTERVAL_MS,
  saveStoredSession,
  shouldRefreshAccessToken,
  touchSessionActivity,
  type AuthUser,
  type StoredAuthSession,
} from "../lib/authSession";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

type LoginResponse = {
  token: string;
  refreshToken?: string;
  refreshIdleExpiresIn?: string;
  user: AuthUser;
  error?: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredAuthSession | null>(() => loadStoredSession());
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const sessionRef = useRef<StoredAuthSession | null>(session);
  const refreshingRef = useRef(false);

  const applySession = useCallback((next: StoredAuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    void logoutAuthSession(sessionRef.current, apiBaseUrl).finally(() => {
      applySession(null);
    });
  }, [apiBaseUrl, applySession]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as LoginResponse;
    if (!response.ok) {
      throw new Error(data?.error || "로그인에 실패했습니다.");
    }
    if (!data.refreshToken) {
      throw new Error("로그인 응답에 refresh token이 없습니다. 백엔드를 최신 버전으로 업데이트해주세요.");
    }

    const next: StoredAuthSession = {
      accessToken: data.token,
      refreshToken: data.refreshToken,
      lastActivityAt: Date.now(),
      idleMs: parseIdleMs(data.refreshIdleExpiresIn),
      user: data.user,
    };
    saveStoredSession(next);
    applySession(next);
  };

  const recordActivity = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    const next = touchSessionActivity(current);
    sessionRef.current = next;
  }, []);

  const ensureFreshAccessToken = useCallback(async (): Promise<string | null> => {
    const current = sessionRef.current;
    if (!current) return null;
    if (isSessionIdleExpired(current)) {
      logout();
      return null;
    }
    if (!shouldRefreshAccessToken(current.accessToken)) {
      return current.accessToken;
    }
    if (refreshingRef.current) {
      return current.accessToken;
    }
    refreshingRef.current = true;
    try {
      const next = await refreshAuthSession(current, apiBaseUrl);
      applySession(next);
      return next.accessToken;
    } catch (_error) {
      logout();
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [apiBaseUrl, applySession, logout]);

  useEffect(() => {
    if (!session) return;

    const onActivity = () => recordActivity();
    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current) return;
      if (isSessionIdleExpired(current)) {
        logout();
        return;
      }
      void ensureFreshAccessToken();
    }, REFRESH_CHECK_INTERVAL_MS);

    void ensureFreshAccessToken();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      window.clearInterval(timer);
    };
  }, [session, recordActivity, logout, ensureFreshAccessToken]);

  useEffect(() => {
    const legacyRaw = localStorage.getItem("sangol_auth");
    if (!session && legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw) as { token?: string; refreshToken?: string };
        if (parsed.token && !parsed.refreshToken) {
          clearStoredSession();
        }
      } catch (_error) {
        clearStoredSession();
      }
    }
  }, [session]);

  const value: AuthContextType = {
    user: session?.user ?? null,
    token: session?.accessToken ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.user),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
