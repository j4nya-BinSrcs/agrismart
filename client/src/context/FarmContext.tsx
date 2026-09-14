import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Farm, FarmPlot, SupportedCrop } from '../types';
import { farmService, CreateFarmInput, CreateFieldInput, DEMO_FARM } from '../services/farmService';
import { useAuth } from './AuthContext';
import { findDistrictCoordinates } from '../data/indiaLocationData';

const ACTIVE_FARM_KEY = 'agrismart_active_farm_id';

interface FarmContextValue {
  farms: Farm[];
  activeFarm: Farm | null;
  isLoading: boolean;
  setActiveFarmId: (farmId: string) => void;
  refreshFarms: () => Promise<void>;
  createFarm: (input: CreateFarmInput) => Promise<Farm>;
  deleteFarm: (farmId: string) => Promise<void>;
  createField: (input: CreateFieldInput) => Promise<FarmPlot>;
  deleteField: (fieldId: string) => Promise<void>;
  farmCoordinates: { lat: number; lon: number };
  locationLabel: string;
}

const FarmContext = createContext<FarmContextValue | undefined>(undefined);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, isDemo, user, consumePendingFarm } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_FARM_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

  const userId = user?.id ?? null;

  const refreshFarms = useCallback(async () => {
    if (!isAuthenticated) {
      setFarms([]);
      return;
    }

    setIsLoading(true);
    try {
      // Only materialize a pending signup farm when the user has no farms yet
      let pending = consumePendingFarm();
      let list = await farmService.listFarms(token, isDemo, userId);

      if (pending && !isDemo && list.length === 0) {
        try {
          await farmService.createFarm(
            token,
            {
              name: pending.name,
              state: pending.state,
              district: pending.district,
              location: pending.location,
              latitude: pending.latitude,
              longitude: pending.longitude,
              totalAreaAcres: pending.totalAreaAcres ?? 0,
            },
            userId
          );
          list = await farmService.listFarms(token, isDemo, userId);
        } catch (err) {
          // Restore pending so a later refresh can retry (e.g. after Mongo comes up)
          localStorage.setItem('agrismart_pending_farm', JSON.stringify(pending));
          console.warn('[FarmContext] Pending farm create failed:', err);
        }
      } else if (pending && list.length > 0) {
        // User already has farms — drop stale pending so add-field never recreates one
        localStorage.removeItem('agrismart_pending_farm');
      }

      setFarms(list);

      if (list.length > 0) {
        const stillExists = list.some((f) => f.id === activeFarmId);
        if (!stillExists) {
          setActiveFarmIdState(list[0].id);
          localStorage.setItem(ACTIVE_FARM_KEY, list[0].id);
        }
      } else {
        setActiveFarmIdState(null);
        localStorage.removeItem(ACTIVE_FARM_KEY);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, isDemo, userId, consumePendingFarm, activeFarmId]);

  useEffect(() => {
    void refreshFarms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, isDemo, userId]);

  const setActiveFarmId = useCallback((farmId: string) => {
    setActiveFarmIdState(farmId);
    localStorage.setItem(ACTIVE_FARM_KEY, farmId);
  }, []);

  const createFarm = useCallback(
    async (input: CreateFarmInput) => {
      const farm = await farmService.createFarm(token, input, userId);
      await refreshFarms();
      setActiveFarmId(farm.id);
      return farm;
    },
    [token, userId, refreshFarms, setActiveFarmId]
  );

  const deleteFarm = useCallback(
    async (farmId: string) => {
      await farmService.deleteFarm(token, farmId, userId);
      await refreshFarms();
    },
    [token, userId, refreshFarms]
  );

  const createField = useCallback(
    async (input: CreateFieldInput) => {
      const farmId = activeFarmId || farms[0]?.id;
      if (!farmId) {
        throw new Error('No active farm selected.');
      }
      const plot = await farmService.createField(token, farmId, input, userId);
      await refreshFarms();
      return plot;
    },
    [token, userId, activeFarmId, farms, refreshFarms]
  );

  const deleteField = useCallback(
    async (fieldId: string) => {
      const farmId = activeFarmId || farms[0]?.id;
      if (!farmId) return;
      await farmService.deleteField(token, farmId, fieldId, userId);
      await refreshFarms();
    },
    [token, userId, activeFarmId, farms, refreshFarms]
  );

  const activeFarm = useMemo(() => {
    if (isDemo) return DEMO_FARM;
    return farms.find((f) => f.id === activeFarmId) || farms[0] || null;
  }, [farms, activeFarmId, isDemo]);

  const farmCoordinates = useMemo(() => {
    if (!activeFarm) return { lat: 22.5645, lon: 72.9289 };
    return findDistrictCoordinates(activeFarm.state, activeFarm.district);
  }, [activeFarm]);

  const locationLabel = useMemo(() => {
    if (!activeFarm) return '';
    return activeFarm.location || [activeFarm.district, activeFarm.state].filter(Boolean).join(', ');
  }, [activeFarm]);

  const value: FarmContextValue = {
    farms: isDemo ? [DEMO_FARM] : farms,
    activeFarm,
    isLoading,
    setActiveFarmId,
    refreshFarms,
    createFarm,
    deleteFarm,
    createField,
    deleteField,
    farmCoordinates,
    locationLabel,
  };

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
};

export const useFarm = (): FarmContextValue => {
  const ctx = useContext(FarmContext);
  if (!ctx) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return ctx;
};

export type { SupportedCrop };
