import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "franchise";
  franchiseId?: number | null;
  franchiseKey?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

const AUTH_STORAGE_KEY = "sangol_auth";
const AuthContext = createContext<AuthContextType | null>(null);

const loadStoredAuth = (): { token: string | null; user: AuthUser | null } => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { token: null, user: null };
  try {
    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    return {
      token: parsed.token || null,
      user: parsed.user || null,
    };
  } catch (_error) {
    return { token: null, user: null };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ token, user }, setAuthState] = useState(loadStoredAuth);
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as LoginResponse & { error?: string };
    if (!response.ok) {
      throw new Error(data?.error || "로그인에 실패했습니다.");
    }

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: data.token, user: data.user })
    );
    setAuthState({ token: data.token, user: data.user });
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({ token: null, user: null });
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const checkSession = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) logout();
          return;
        }
      } catch (_error) {
        // 네트워크 일시 오류는 즉시 로그아웃하지 않음
      }
    };
    void checkSession();
    const timer = window.setInterval(() => {
      void checkSession();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, token]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
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
