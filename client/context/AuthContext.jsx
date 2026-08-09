import { createContext, useContext, useEffect, useState } from 'react';
import { client, setTokens, clearTokens, getAccessToken } from '../api/baseApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMyProfile() {
    try {
      const res = await client.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (getAccessToken()) {
      loadMyProfile();
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const res = await client.post('/auth/login', { email, password });
    setTokens(res.data.accessToken, res.data.refreshToken);
    await loadMyProfile();
  }

  async function signup(payload) {
    const res = await client.post('/auth/signup', payload);
    setTokens(res.data.accessToken, res.data.refreshToken);
    await loadMyProfile();
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await client.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.log(err)
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: loadMyProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
