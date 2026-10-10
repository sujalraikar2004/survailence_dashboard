import React, { createContext, useContext, useState } from 'react';
import { authService, LoginCredentials } from '../../services/auth/authService';
import { Permission, Role, User } from '../../types';
import { can as checkPermission } from '../../utils/rbac';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginByRole: (role: Role) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
  demoAccounts: User[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginByRole = async (role: Role) => {
    setIsLoading(true);
    try {
      const response = await authService.loginByRole(role);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const can = (permission: Permission) => checkPermission(user, permission);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        loginByRole,
        logout,
        can,
        demoAccounts: authService.getDemoAccounts(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
