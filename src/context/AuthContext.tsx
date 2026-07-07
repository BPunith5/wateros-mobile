import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, getToken, setToken, removeToken, type AuthUser } from '@/src/lib/api';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
