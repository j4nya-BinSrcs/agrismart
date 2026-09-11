import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { getStoredItem, setStoredItem } from '../utils/storage';

const AUTH_STORAGE_KEY = 'agrismart_auth_session';
const REGISTERED_ACCOUNTS_KEY = 'agrismart_registered_accounts';

export const DEMO_USER: User = {
  id: 'demo-user-1',
  name: 'AgriSmartDemo',
  username: 'AgriSmartDemo',
  email: 'demo@agrismart.ai',
  role: 'Lead Grower',
  farmName: 'Patel Farm',
  location: 'Anand, Gujarat',
};

export const DEMO_CREDENTIALS = {
  username: 'AgriSmartDemo',
  password: 'Agri@2026',
};

interface StoredAuthSession {
  isAuthenticated: boolean;
  user: User;
}

interface StoredAccount {
  user: User;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = getStoredItem<StoredAuthSession | null>(AUTH_STORAGE_KEY, null);
    return session?.isAuthenticated === true;
  });

  const [user, setUser] = useState<User | null>(() => {
    const session = getStoredItem<StoredAuthSession | null>(AUTH_STORAGE_KEY, null);
    return session?.isAuthenticated && session.user ? session.user : null;
  });

  // Keep session in localStorage synced
  useEffect(() => {
    if (isAuthenticated && user) {
      setStoredItem<StoredAuthSession>(AUTH_STORAGE_KEY, {
        isAuthenticated: true,
        user,
      });
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [isAuthenticated, user]);

  const login = async (
    usernameOrEmail: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Simulate brief network latency for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    const trimmedIdentifier = usernameOrEmail.trim();
    const trimmedPass = pass.trim();

    if (!trimmedIdentifier) {
      return { success: false, error: 'Please enter your username or email.' };
    }
    if (!trimmedPass) {
      return { success: false, error: 'Please enter your password.' };
    }

    // 1. Check Demo account credentials (AgriSmartDemo / Agri@2026)
    const isDemoIdentifier =
      trimmedIdentifier.toLowerCase() === DEMO_CREDENTIALS.username.toLowerCase() ||
      trimmedIdentifier.toLowerCase() === 'demo@agrismart.ai';

    if (isDemoIdentifier) {
      if (trimmedPass === DEMO_CREDENTIALS.password || trimmedPass === 'demo123') {
        setIsAuthenticated(true);
        setUser(DEMO_USER);
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }

    // 2. Check registered accounts from local storage
    const registered = getStoredItem<StoredAccount[]>(REGISTERED_ACCOUNTS_KEY, []);
    const matched = registered.find(
      (acc) =>
        acc.user.username?.toLowerCase() === trimmedIdentifier.toLowerCase() ||
        acc.user.email.toLowerCase() === trimmedIdentifier.toLowerCase()
    );

    if (matched) {
      if (matched.password === trimmedPass) {
        setIsAuthenticated(true);
        setUser(matched.user);
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }

    // 3. Fallback for valid formatted input during demo sessions
    if (trimmedIdentifier.length >= 3 && trimmedPass.length >= 6) {
      const customUser: User = {
        id: `user-${Date.now()}`,
        name: trimmedIdentifier,
        username: trimmedIdentifier,
        email: trimmedIdentifier.includes('@')
          ? trimmedIdentifier.toLowerCase()
          : `${trimmedIdentifier.toLowerCase()}@agrismart.ai`,
        role: 'Grower / Farm Operator',
        farmName: 'Patel Farm',
        location: 'Anand, Gujarat',
      };
      setIsAuthenticated(true);
      setUser(customUser);
      return { success: true };
    }

    return { success: false, error: 'Invalid username or password.' };
  };

  const loginAsDemo = () => {
    setIsAuthenticated(true);
    setUser(DEMO_USER);
  };

  const signup = async (data: {
    name: string;
    username?: string;
    email: string;
    password: string;
    farmName: string;
    location: string;
  }): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (!data.name.trim()) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!data.email.trim() || !data.email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!data.password.trim() || data.password.trim().length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!data.farmName.trim()) {
      return { success: false, error: 'Please enter your farm name.' };
    }
    if (!data.location.trim()) {
      return { success: false, error: 'Please enter your location.' };
    }

    const generatedUsername =
      data.username?.trim() ||
      data.name.trim().replace(/\s+/g, '') ||
      data.email.split('@')[0];

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      username: generatedUsername,
      email: data.email.trim().toLowerCase(),
      role: 'Lead Grower',
      farmName: data.farmName.trim(),
      location: data.location.trim(),
    };

    // Save to local registered accounts
    const existing = getStoredItem<StoredAccount[]>(REGISTERED_ACCOUNTS_KEY, []);
    setStoredItem<StoredAccount[]>(REGISTERED_ACCOUNTS_KEY, [
      ...existing,
      { user: newUser, password: data.password.trim() },
    ]);

    setIsAuthenticated(true);
    setUser(newUser);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        loginAsDemo,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
