import React from 'react';
import { apiFetch } from './api.js';

const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [state, setState] = React.useState({ status: 'loading', user: null });

  const fetchMe = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me/');
      if (res.ok) {
        const user = await res.json();
        setState({ status: 'authenticated', user });
        return user;
      }
      setState({ status: 'unauthenticated', user: null });
      return null;
    } catch (e) {
      setState({ status: 'unauthenticated', user: null });
      return null;
    }
  }, []);

  React.useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = React.useCallback(async (username, password) => {
    const res = await apiFetch('/api/auth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new Error('Nieprawidłowa nazwa użytkownika lub hasło.');
    }
    await fetchMe();
    return true;
  }, [fetchMe]);

  const logout = React.useCallback(async () => {
    try {
      await apiFetch('/api/auth/token/logout/', { method: 'POST' });
    } finally {
      setState({ status: 'unauthenticated', user: null });
    }
  }, []);

  const value = {
    status: state.status,
    user: state.user,
    login,
    logout,
    refresh: fetchMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AuthProvider, useAuth };
