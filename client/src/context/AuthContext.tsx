import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType, UserRole } from '../types';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { apiRequestWithAuth, ApiError } from '../services/apiClient';
import { findDistrictCoordinates } from '../data/indiaLocationData';

const AUTH_STORAGE_KEY = 'agrismart_auth_session';
const REGISTERED_ACCOUNTS_KEY = 'agrismart_registered_accounts';
const PENDING_FARM_KEY = 'agrismart_pending_farm';

export const DEMO_USER: User = {
  id: 'demo-user-1',
  name: 'AgriSmartDemo',
  username: 'AgriSmartDemo',
  email: 'demo@agrismart.ai',
  role: 'owner',
};

export const DEMO_CREDENTIALS = {
  username: 'AgriSmartDemo',
  password: 'Agri@2026',
};

export interface PendingFarmSetup {
  name: string;
  state: string;
  district: string;
  location: string;
  latitude: number;
  longitude: number;
  totalAreaAcres?: number;
}

interface StoredAuthSession {
  isAuthenticated: boolean;
  user: User;
  token?: string;
  isDemo?: boolean;
}

interface StoredAccount {
  user: User;
  password: string;
  pendingFarm?: PendingFarmSetup;
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

interface AuthContextValue extends AuthContextType {
  isDemo: boolean;
  consumePendingFarm: () => PendingFarmSetup | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  const [isDemo, setIsDemo] = useState<boolean>(() => {
    const session = getStoredItem<StoredAuthSession | null>(AUTH_STORAGE_KEY, null);
    return session?.isDemo === true;
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setStoredItem<StoredAuthSession>(AUTH_STORAGE_KEY, {
        isAuthenticated: true,
        user,
        token: authToken || undefined,
        isDemo,
      });
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [isAuthenticated, user, authToken, isDemo]);

  const consumePendingFarm = useCallback((): PendingFarmSetup | null => {
    const pending = getStoredItem<PendingFarmSetup | null>(PENDING_FARM_KEY, null);
    if (pending) {
      localStorage.removeItem(PENDING_FARM_KEY);
    }
    return pending;
  }, []);

  const login = async (
    usernameOrEmail: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const trimmedIdentifier = usernameOrEmail.trim();
    const trimmedPass = pass.trim();

    if (!trimmedIdentifier) {
      return { success: false, error: 'Please enter your username or email.' };
    }
    if (!trimmedPass) {
      return { success: false, error: 'Please enter your password.' };
    }

    const isDemoIdentifier =
      trimmedIdentifier.toLowerCase() === DEMO_CREDENTIALS.username.toLowerCase() ||
      trimmedIdentifier.toLowerCase() === 'demo@agrismart.ai';

    if (isDemoIdentifier) {
      if (trimmedPass === DEMO_CREDENTIALS.password || trimmedPass === 'demo123') {
        setIsAuthenticated(true);
        setUser(DEMO_USER);
        setAuthToken(null);
        setIsDemo(true);
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }

    // Backend login (email-based)
    if (trimmedIdentifier.includes('@')) {
      try {
        const response = await apiRequestWithAuth<BackendAuthResponse>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({
              email: trimmedIdentifier.toLowerCase(),
              password: trimmedPass,
            }),
          },
          null
        );

        const backendUser: User = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: (response.user.role as UserRole) || 'farmer',
        };

        setIsAuthenticated(true);
        setUser(backendUser);
        setAuthToken(response.token);
        setIsDemo(false);
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          return { success: false, error: 'Invalid email or password.' };
        }
        // Fall through to local storage if network/other errors
      }
    }

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
        setAuthToken(null);
        setIsDemo(false);
        if (matched.pendingFarm) {
          setStoredItem(PENDING_FARM_KEY, matched.pendingFarm);
        }
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }

    return { success: false, error: 'Invalid username or password.' };
  };

  const loginAsDemo = () => {
    setIsAuthenticated(true);
    setUser(DEMO_USER);
    setAuthToken(null);
    setIsDemo(true);
  };

  const signup = async (data: {
    name: string;
    username?: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: UserRole;
    state?: string;
    district?: string;
    farmName: string;
    location?: string;
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
    if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }
    if (!data.farmName.trim()) {
      return { success: false, error: 'Please enter your farm name.' };
    }
    if (!data.state || !data.district) {
      return { success: false, error: 'Please select state and district.' };
    }

    const generatedUsername =
      data.username?.trim() ||
      data.name.trim().replace(/\s+/g, '') ||
      data.email.split('@')[0];

    const coords = findDistrictCoordinates(data.state, data.district);
    const locationLabel = data.location || `${data.district}, ${data.state}`;

    const pendingFarm: PendingFarmSetup = {
      name: data.farmName.trim(),
      state: data.state,
      district: data.district,
      location: locationLabel,
      latitude: coords.lat,
      longitude: coords.lon,
      totalAreaAcres: 0,
    };

    let backendToken: string | null = null;
    let backendUserId: string | null = null;
    let backendRole: UserRole = data.role || 'owner';

    try {
      const response = await apiRequestWithAuth<BackendAuthResponse>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password.trim(),
            confirmPassword: data.confirmPassword?.trim(),
            role: data.role || 'owner',
          }),
        },
        null
      );

      backendToken = response.token;
      backendUserId = response.user.id;
      backendRole = (response.user.role as UserRole) || data.role || 'owner';

      // Create farm on backend immediately when we have a token
      try {
        await apiRequestWithAuth(
          '/farms',
          {
            method: 'POST',
            body: JSON.stringify({
              name: pendingFarm.name,
              totalAreaAcres: 0,
              state: pendingFarm.state,
              district: pendingFarm.district,
              location: {
                latitude: pendingFarm.latitude,
                longitude: pendingFarm.longitude,
                address: pendingFarm.location,
              },
            }),
          },
          backendToken
        );
      } catch {
        // Keep pending farm for FarmContext offline/local creation
        setStoredItem(PENDING_FARM_KEY, pendingFarm);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 400) {
        return { success: false, error: err.message || 'Could not create account.' };
      }
      // Backend unavailable — continue with local registration
      setStoredItem(PENDING_FARM_KEY, pendingFarm);
    }

    const newUser: User = {
      id: backendUserId || `user-${Date.now()}`,
      name: data.name.trim(),
      username: generatedUsername,
      email: data.email.trim().toLowerCase(),
      role: backendRole,
    };

    const existing = getStoredItem<StoredAccount[]>(REGISTERED_ACCOUNTS_KEY, []);
    setStoredItem<StoredAccount[]>(REGISTERED_ACCOUNTS_KEY, [
      ...existing.filter((a) => a.user.email !== newUser.email),
      { user: newUser, password: data.password.trim(), pendingFarm },
    ]);

    if (!backendToken) {
      setStoredItem(PENDING_FARM_KEY, pendingFarm);
    }

    setIsAuthenticated(true);
    setUser(newUser);
    setAuthToken(backendToken);
    setIsDemo(false);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setAuthToken(null);
    setIsDemo(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token: authToken,
        isDemo,
        login,
        loginAsDemo,
        signup,
        logout,
        consumePendingFarm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
