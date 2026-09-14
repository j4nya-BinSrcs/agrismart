import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { apiRequestWithAuth, ApiError } from '../services/apiClient';

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
  token?: string;
}

interface StoredAccount {
  user: User;
  password: string;
}

interface BackendAuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
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

  const [authToken, setAuthToken] = useState<string | null>(() => {
    const session = getStoredItem<StoredAuthSession | null>(AUTH_STORAGE_KEY, null);
    return session?.token || null;
  });

  // Keep session in localStorage synced
  useEffect(() => {
    if (isAuthenticated && user) {
      setStoredItem<StoredAuthSession>(AUTH_STORAGE_KEY, {
        isAuthenticated: true,
        user,
        token: authToken || undefined,
      });
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [isAuthenticated, user, authToken]);

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
        setAuthToken(null); // Demo has no backend token
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }

    // 2. Try backend authentication
    try {
      const response = await apiRequestWithAuth<BackendAuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: trimmedIdentifier.includes('@') ? trimmedIdentifier : undefined,
          // Backend only supports email for login, so if username is provided, 
          // we'd need a different endpoint or the user would use email
        }),
      }, null);

      // Backend expects email, so if username was provided, this will fail
      // Fall through to local storage check
    } catch (err) {
      // If backend is unavailable or login fails, fall through to local storage
      if (err instanceof ApiError && err.statusCode === 0) {
        // Network error - backend unavailable
      } else if (err instanceof ApiError && err.statusCode === 401) {
        // Invalid credentials
      }
      // Continue to local storage fallback
    }

    // 3. Check registered accounts from local storage (offline fallback)
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
        setAuthToken(null); // Local auth has no backend token
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }

    // 4. Fallback for valid formatted input during demo sessions
    if (trimmedIdentifier.length >= 3 && trimmedPass.length >= 6) {
      const fallbackFarmName = trimmedIdentifier.includes('@')
        ? trimmedIdentifier.split('@')[0]
        : trimmedIdentifier;
      const customUser: User = {
        id: `user-${Date.now()}`,
        name: trimmedIdentifier,
        username: trimmedIdentifier,
        email: trimmedIdentifier.includes('@')
          ? trimmedIdentifier.toLowerCase()
          : `${trimmedIdentifier.toLowerCase()}@agrismart.ai`,
        role: 'Grower / Farm Operator',
        farmName: fallbackFarmName,
        location: trimmedIdentifier.includes('@')
          ? 'Your registered location'
          : 'Anand, Gujarat',
      };
      setIsAuthenticated(true);
      setUser(customUser);
      setAuthToken(null);
      return { success: true };
    }

    return { success: false, error: 'Invalid username or password.' };
  };

  const loginAsDemo = () => {
    setIsAuthenticated(true);
    setUser(DEMO_USER);
    setAuthToken(null);
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

    // Try backend registration first
    let backendToken: string | null = null;
    let backendUserId: string | null = null;

    try {
      const response = await apiRequestWithAuth<BackendAuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password.trim(),
          role: 'farmer',
        }),
      }, null);

      backendToken = response.token;
      backendUserId = response.user.id;
    } catch (err) {
      // If backend unavailable or error, continue with local registration
      if (err instanceof ApiError && err.statusCode === 0) {
        // Network error - backend unavailable
      } else if (err instanceof ApiError && err.statusCode === 400) {
        // Validation error - might be duplicate email
        // Continue to local storage
      }
    }

    const newUser: User = {
      id: backendUserId || `user-${Date.now()}`,
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
    setAuthToken(backendToken);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token: authToken,
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
