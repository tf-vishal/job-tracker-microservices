import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On app mount: attempt to restore session via stored refresh token
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(({ data }) => setUser(data.data.user))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  // Listen for forced logouts triggered by the axios interceptor
  useEffect(() => {
    const handle = () => logout();
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    const { user: u, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authApi.register({ name, email, password });
    const { user: u, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
