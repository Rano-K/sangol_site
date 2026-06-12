import { API_BASE_URL } from './apiBaseUrl';

export const ADMIN_AUTH_STORAGE_KEY = 'admin_auth';
export const DEFAULT_IDLE_MS = 60 * 60 * 1000;
export const REFRESH_CHECK_INTERVAL_MS = 30 * 1000;
export const ACCESS_REFRESH_LEAD_MS = 2 * 60 * 1000;

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'franchise';
  franchiseId?: number | null;
  franchiseKey?: string | null;
};

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string;
  lastActivityAt: number;
  idleMs: number;
  user?: AuthUser;
};

type RefreshResponse = {
  token: string;
  refreshToken: string;
  refreshIdleExpiresIn?: string;
  user: AuthUser;
  error?: string;
};

export const loadStoredSession = (): StoredAuthSession | null => {
  const legacyToken = localStorage.getItem('admin_token');
  const raw = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!raw) {
    if (!legacyToken) return null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      lastActivityAt: Number(parsed.lastActivityAt || Date.now()),
      idleMs: Number(parsed.idleMs || DEFAULT_IDLE_MS),
      user: parsed.user,
    };
  } catch (_error) {
    return null;
  }
};

export const saveStoredSession = (session: StoredAuthSession): void => {
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(session));
  localStorage.removeItem('admin_token');
};

export const clearStoredSession = (): void => {
  localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  localStorage.removeItem('admin_token');
};

export const parseIdleMs = (value?: string): number => {
  if (!value) return DEFAULT_IDLE_MS;
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) return DEFAULT_IDLE_MS;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (unitMs[unit] ?? 3_600_000);
};

export const getAccessTokenExpiryMs = (accessToken: string): number | null => {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1])) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch (_error) {
    return null;
  }
};

export const isSessionIdleExpired = (session: StoredAuthSession): boolean =>
  Date.now() - session.lastActivityAt > session.idleMs;

export const touchSessionActivity = (session: StoredAuthSession): StoredAuthSession => {
  const next = { ...session, lastActivityAt: Date.now() };
  saveStoredSession(next);
  return next;
};

export const shouldRefreshAccessToken = (accessToken: string): boolean => {
  const expiryMs = getAccessTokenExpiryMs(accessToken);
  if (!expiryMs) return true;
  return expiryMs - Date.now() <= ACCESS_REFRESH_LEAD_MS;
};

export const refreshAuthSession = async (
  session: StoredAuthSession,
  apiBaseUrl: string = API_BASE_URL
): Promise<StoredAuthSession> => {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const data = (await response.json()) as RefreshResponse;
  if (!response.ok) {
    throw new Error(data?.error || '세션 갱신에 실패했습니다.');
  }

  const next: StoredAuthSession = {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    lastActivityAt: Date.now(),
    idleMs: parseIdleMs(data.refreshIdleExpiresIn) || session.idleMs,
    user: data.user,
  };
  saveStoredSession(next);
  return next;
};

export const logoutAuthSession = async (
  session: StoredAuthSession | null,
  apiBaseUrl: string = API_BASE_URL
): Promise<void> => {
  if (session?.refreshToken) {
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    } catch (_error) {
      // ignore network errors during logout
    }
  }
  clearStoredSession();
};
