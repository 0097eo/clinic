import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, getCurrentUser } from '../services/api';

const AuthContext = createContext();

const TOKEN_STORAGE_KEY = 'clinic-app-token';
const USER_STORAGE_KEY = 'clinic-app-user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginRequest({ email, password });
      setToken(response.token);
      setUser(response.data);
      return response;
    } catch (err) {
      const message = err?.details?.message || err?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return null;
    }
    try {
      const response = await getCurrentUser(token);
      const payload = response?.data ?? response;
      setUser(payload);
      return payload;
    } catch (err) {
      console.error('Failed to refresh user profile', err);
      return null;
    }
  }, [token]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      login,
      logout,
      refreshUser,
      clearError
    }),
    [token, user, loading, error, login, logout, refreshUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
