'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  AUTH_STORAGE_KEY,
  StoredAuth,
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
} from '../lib/auth-client';

type AuthContextValue = {
  auth: StoredAuth | null;
  isLoading: boolean;
  login: (data: StoredAuth) => void;
  logout: () => void;
  updateAuth: (data: StoredAuth) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setAuth(stored);
    }
    setIsLoading(false);
  }, []);

  const login = (data: StoredAuth) => {
    setStoredAuth(data);
    setAuth(data);
  };

  const logout = () => {
    clearStoredAuth();
    setAuth(null);
    router.replace('/login');
  };

  const updateAuth = (data: StoredAuth) => {
    setStoredAuth(data);
    setAuth(data);
  };

  const value = useMemo(
    () => ({ auth, isLoading, login, logout, updateAuth }),
    [auth, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}


