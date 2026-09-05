'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, getStoredToken, setStoredToken } from '@/lib/api';

export type AuthRole = 'user' | 'admin';

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
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface SignupOrLoginResponse {
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

  const signup = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<SignupOrLoginResponse>('/auth/signup', { email, password });
    setStoredToken(data.data.token);
    setUser(data.data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<SignupOrLoginResponse>('/auth/login', { email, password });
    setStoredToken(data.data.token);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signup, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
