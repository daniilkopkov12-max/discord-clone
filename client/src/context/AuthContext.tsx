import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserStatus } from '../types';
import { api } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (loginText: string, passwordText: string) => Promise<void>;
  register: (username: string, email: string, passwordText: string, displayName?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateStatus: (status: UserStatus) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate token on mount
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const currentUser = await api.get<User>('/api/auth/me');
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (loginText: string, passwordText: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/login', {
      login: loginText,
      password: passwordText,
    });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
  };

  const register = async (username: string, email: string, passwordText: string, displayName?: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/register', {
      username,
      email,
      password: passwordText,
      displayName,
    });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateProfile = async (data: Partial<User>) => {
    const updated = await api.patch<User>('/api/auth/me', data);
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  const updateStatus = async (status: UserStatus) => {
    await api.patch('/api/auth/status', { status });
    if (user) {
      const updated = { ...user, status };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        updateStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
