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
  const { isAuthenticated, token, isDemo, consumePendingFarm } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_FARM_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

  const refreshFarms = useCallback(async () => {
    if (!isAuthenticated) {
      setFarms([]);
      return;
    }

    setIsLoading(true);
    try {
      let pending = consumePendingFarm();
      if (pending && !isDemo) {
        await farmService.createFarm(token, {
          name: pending.name,
          state: pending.state,
          district: pending.district,
          location: pending.location,
          latitude: pending.latitude,
          longitude: pending.longitude,
          totalAreaAcres: pending.totalAreaAcres ?? 0,
        });
      }

      const list = await farmService.listFarms(token, isDemo);
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
  }, [isAuthenticated, token, isDemo, consumePendingFarm, activeFarmId]);

  useEffect(() => {
    void refreshFarms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, isDemo]);

  const setActiveFarmId = useCallback((farmId: string) => {
    setActiveFarmIdState(farmId);
    localStorage.setItem(ACTIVE_FARM_KEY, farmId);
  }, []);

  const createFarm = useCallback(
    async (input: CreateFarmInput) => {
      const farm = await farmService.createFarm(token, input);
      await refreshFarms();
      setActiveFarmId(farm.id);
      return farm;
    },
    [token, refreshFarms, setActiveFarmId]
  );

  const deleteFarm = useCallback(
    async (farmId: string) => {
      await farmService.deleteFarm(token, farmId);
      await refreshFarms();
    },
    [token, refreshFarms]
  );

  const createField = useCallback(
    async (input: CreateFieldInput) => {
      const farmId = activeFarmId || farms[0]?.id;
      if (!farmId) {
        throw new Error('No active farm selected.');
      }
      const plot = await farmService.createField(token, farmId, input);
      await refreshFarms();
      return plot;
    },
    [token, activeFarmId, farms, refreshFarms]
  );

  const deleteField = useCallback(
    async (fieldId: string) => {
      const farmId = activeFarmId || farms[0]?.id;
      if (!farmId) return;
      await farmService.deleteField(token, farmId, fieldId);
      await refreshFarms();
    },
    [token, activeFarmId, farms, refreshFarms]
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
