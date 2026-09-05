'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, getStoredToken, setStoredToken } from '@/lib/api';

export type AuthRole = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

export interface AuthUser {
  id: string;
  role: AuthRole;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface LoginResponse {
  data: {
    token: string;
    user: { id: string; email: string; role: AuthRole; createdAt: string; updatedAt: string };
  };
}

interface MeResponse {
  data: { sub: string; role: AuthRole };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<MeResponse>('/auth/me')
      .then(({ data }) => setUser({ id: data.data.sub, role: data.data.role }))
      .catch(() => setStoredToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    setStoredToken(data.data.token);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
