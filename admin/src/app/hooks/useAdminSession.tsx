import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';
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
} from '../lib/authSession';

type LoginPayload = {
  token: string;
  refreshToken: string;
  refreshIdleExpiresIn?: string;
  user: AuthUser;
};

export function useAdminSession() {
  const apiBaseUrl = API_BASE_URL;
  const [session, setSession] = useState<StoredAuthSession | null>(() => loadStoredSession());
  const sessionRef = useRef<StoredAuthSession | null>(session);
  const refreshingRef = useRef(false);

  const applySession = useCallback((next: StoredAuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await logoutAuthSession(sessionRef.current, apiBaseUrl);
    applySession(null);
  }, [apiBaseUrl, applySession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      if (payload.user.role !== 'admin') {
        throw new Error('관리자 계정만 로그인할 수 있습니다.');
      }
      const next: StoredAuthSession = {
        accessToken: payload.token,
        refreshToken: payload.refreshToken,
        lastActivityAt: Date.now(),
        idleMs: parseIdleMs(payload.refreshIdleExpiresIn),
        user: payload.user,
      };
      saveStoredSession(next);
      applySession(next);
    },
    [applySession]
  );

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
      await logout();
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
      await logout();
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [apiBaseUrl, applySession, logout]);

  useEffect(() => {
    if (!session) return;

    const onActivity = () => recordActivity();
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current) return;
      if (isSessionIdleExpired(current)) {
        void logout();
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
    const legacyToken = localStorage.getItem('admin_token');
    if (legacyToken && !session) {
      clearStoredSession();
    }
  }, [session]);

  return {
    accessToken: session?.accessToken ?? null,
    user: session?.user ?? null,
    login,
    logout,
    ensureFreshAccessToken,
  };
}
