import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, systemApi, getToken, setToken, removeToken, type AuthUser } from '@/src/lib/api';
import { clearCache } from '@/src/lib/cache';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  telemetryProtocol: 'mqtt' | 'http';
  setTelemetryProtocol: (p: 'mqtt' | 'http') => void;
  login: (email: string) => Promise<void>;
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [telemetryProtocol, setTelemetryProtocol] = useState<'mqtt' | 'http'>('mqtt');

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await authApi.me();
          setUser(me as AuthUser);
        }
      } catch {
        await removeToken();
      } finally {
        setLoading(false);
        // Fetch system config after auth resolves (public endpoint, always runs)
        systemApi.getConfig().then(c => setTelemetryProtocol(c.telemetryProtocol)).catch(() => {});
      }
    })();
  }, []);

  const login = async (email: string) => {
    await authApi.login(email);
  };

  const loginWithToken = async (token: string, userData: AuthUser) => {
    await setToken(token);
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string) => {
    const { token, user } = await authApi.register(name, email, password);
    await setToken(token);
    setUser(user);
  };

  const logout = async () => {
    clearCache();
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, telemetryProtocol, setTelemetryProtocol, login, loginWithToken, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
