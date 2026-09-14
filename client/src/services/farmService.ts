import { Farm, FarmPlot, ActionItem, AppNotification, SupportedCrop, FarmMember } from '../types';
import { TODAY_ACTIONS, INITIAL_NOTIFICATIONS } from '../data/mockData';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { apiRequestWithAuth, ApiError } from './apiClient';
import { findDistrictCoordinates } from '../data/indiaLocationData';

export const DEMO_FARM: Farm = {
  id: 'farm-patel-anand',
  name: 'Patel Farm',
  members: [{ user: 'demo-user-1', role: 'owner' }],
  location: 'Anand, Gujarat',
  state: 'Gujarat',
  district: 'Anand',
  totalAcres: 18.5,
  primaryCrops: ['tomato', 'potato', 'pepper_bell'],
  plots: [
    {
      id: 'plot-tomato',
      name: 'Field A (Tomato)',
      crop: 'tomato',
      variety: 'Abhinav Hybrid',
      acres: 6.0,
      growthStage: 'Fruiting (Week 9)',
      soilType: 'Sandy Loam',
      rootDepth: '45 cm',
      healthStatus: 'attention',
      currentMoisture: 31,
      targetMoisture: 45,
    },
    {
      id: 'plot-potato',
      name: 'Field B (Potato)',
      crop: 'potato',
      variety: 'Kufri Jyoti',
      acres: 8.0,
      growthStage: 'Tuber Initiation',
      soilType: 'Clay Loam',
      rootDepth: '40 cm',
      healthStatus: 'optimal',
      currentMoisture: 48,
      targetMoisture: 50,
    },
    {
      id: 'plot-pepper',
      name: 'Field C (Pepper Bell)',
      crop: 'pepper_bell',
      variety: 'California Wonder',
      acres: 4.5,
      growthStage: 'Flowering',
      soilType: 'Loam',
      rootDepth: '35 cm',
      healthStatus: 'optimal',
      currentMoisture: 26,
      targetMoisture: 40,
    },
  ],
};

/** @deprecated Use DEMO_FARM */
export const DEFAULT_FARM = DEMO_FARM;

const ACTIONS_STORAGE_KEY = 'actions_list';
const NOTIFICATIONS_STORAGE_KEY = 'notifications_list';
const LOCAL_FARMS_KEY = 'agrismart_local_farms';

interface BackendFarm {
  id: string;
  name: string;
  members?: FarmMember[];
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  state?: string;
  district?: string;
  totalAreaAcres: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  fields?: BackendField[];
}

interface BackendField {
  id: string;
  name: string;
  areaAcres: number;
  crop: SupportedCrop;
  variety?: string;
  growthStage?: string;
  soilType?: string;
  irrigationMethod?: string;
  soilMoisture?: number | null;
  zones?: Array<{
    id: string;
    name: string;
    soilMoisture?: number | null;
  }>;
}

interface BackendFarmListResponse {
  farms: BackendFarm[];
}

interface BackendFarmResponse {
  farm: BackendFarm;
}

interface BackendFieldListResponse {
  fields: BackendField[];
}

interface BackendFieldResponse {
  field: BackendField;
}

function fieldToPlot(field: BackendField): FarmPlot {
  return {
    id: field.id,
    name: field.name,
    crop: field.crop,
    variety: field.variety || '',
    acres: field.areaAcres,
    growthStage: field.growthStage || '',
    soilType: field.soilType || '',
    rootDepth: '',
    healthStatus: 'optimal',
    currentMoisture: field.soilMoisture ?? 30,
    targetMoisture: 45,
  };
}

function mapBackendFarmToClient(backendFarm: BackendFarm, fields: BackendField[] = []): Farm {
  const plots = (backendFarm.fields || fields).map(fieldToPlot);
  const primaryCrops = [...new Set(plots.map((p) => p.crop))];

  return {
    id: backendFarm.id,
    name: backendFarm.name,
    members: backendFarm.members || [],
    location:
      backendFarm.location?.address ||
      [backendFarm.district, backendFarm.state].filter(Boolean).join(', ') ||
      'Unknown location',
    state: backendFarm.state,
    district: backendFarm.district,
    totalAcres: backendFarm.totalAreaAcres,
    primaryCrops,
    plots,
  };
}

export interface CreateFarmInput {
  name: string;
  state: string;
  district: string;
  totalAreaAcres?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateFieldInput {
  name: string;
  areaAcres: number;
  crop: SupportedCrop;
  variety?: string;
  growthStage?: string;
  soilType?: string;
  irrigationMethod?: string;
  soilMoisture?: number | null;
}

function localFarmsKey(userId?: string | null) {
  return userId ? `${LOCAL_FARMS_KEY}_${userId}` : LOCAL_FARMS_KEY;
}

function getLocalFarms(userId?: string | null): Farm[] {
  return getStoredItem<Farm[]>(localFarmsKey(userId), []);
}

function saveLocalFarms(farms: Farm[], userId?: string | null) {
  setStoredItem(localFarmsKey(userId), farms);
}

export const farmService = {
  async listFarms(token: string | null, isDemo = false, userId?: string | null): Promise<Farm[]> {
    if (isDemo) {
      return [DEMO_FARM];
    }

    if (token) {
      try {
        const response = await apiRequestWithAuth<BackendFarmListResponse>('/farms', {}, token);
        const farms = response.farms || [];
        const mapped: Farm[] = [];
        for (const f of farms) {
          try {
            const fieldsRes = await apiRequestWithAuth<BackendFieldListResponse>(
              `/farms/${f.id}/fields`,
              {},
              token
            );
            mapped.push(mapBackendFarmToClient(f, fieldsRes.fields || []));
          } catch {
            mapped.push(mapBackendFarmToClient(f, []));
          }
        }
        saveLocalFarms(mapped, userId);
        return mapped;
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          throw err;
        }
        // Network/offline — fall through to per-user local cache
      }
    }

    return getLocalFarms(userId);
  },

  async getFarmDetails(token: string | null, isDemo = false, userId?: string | null): Promise<Farm> {
    const farms = await this.listFarms(token, isDemo, userId);
    return farms[0] || (isDemo ? DEMO_FARM : {
      id: 'no-farm',
      name: 'No Farm',
      members: [],
      location: '',
      totalAcres: 0,
      primaryCrops: [],
      plots: [],
    });
  },

  async createFarm(token: string | null, input: CreateFarmInput, userId?: string | null): Promise<Farm> {
    const coords =
      input.latitude != null && input.longitude != null
        ? { lat: input.latitude, lon: input.longitude }
        : findDistrictCoordinates(input.state, input.district);
    const address = input.location || `${input.district}, ${input.state}`;

    if (token) {
      const response = await apiRequestWithAuth<BackendFarmResponse>(
        '/farms',
        {
          method: 'POST',
          body: JSON.stringify({
            name: input.name,
            totalAreaAcres: input.totalAreaAcres ?? 0,
            state: input.state,
            district: input.district,
            location: {
              latitude: coords.lat,
              longitude: coords.lon,
              address,
            },
          }),
        },
        token
      );
      const farm = mapBackendFarmToClient(response.farm, []);
      const local = getLocalFarms(userId).filter((f) => f.id !== farm.id);
      saveLocalFarms([farm, ...local], userId);
      return farm;
    }

    // Offline / local-only account
    const existing = getLocalFarms(userId);
    if (existing.some((f) => f.name.toLowerCase() === input.name.trim().toLowerCase())) {
      throw new ApiError(`You already have a farm named "${input.name.trim()}".`, 400);
    }

    const localFarm: Farm = {
      id: `local-farm-${Date.now()}`,
      name: input.name,
      members: userId ? [{ user: userId, role: 'owner' }] : [],
      location: address,
      state: input.state,
      district: input.district,
      totalAcres: input.totalAreaAcres ?? 0,
      primaryCrops: [],
      plots: [],
    };
    saveLocalFarms([localFarm, ...existing], userId);
    return localFarm;
  },

  async deleteFarm(token: string | null, farmId: string, userId?: string | null): Promise<void> {
    if (token && !farmId.startsWith('local-')) {
      await apiRequestWithAuth(`/farms/${farmId}`, { method: 'DELETE' }, token);
    }
    saveLocalFarms(getLocalFarms(userId).filter((f) => f.id !== farmId), userId);
  },

  async createField(
    token: string | null,
    farmId: string,
    input: CreateFieldInput,
    userId?: string | null
  ): Promise<FarmPlot> {
    if (token && !farmId.startsWith('local-')) {
      const response = await apiRequestWithAuth<BackendFieldResponse>(
        `/farms/${farmId}/fields`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...input,
            soilMoisture: input.soilMoisture ?? 30,
          }),
        },
        token
      );
      const plot = fieldToPlot(response.field);
      const farms = getLocalFarms(userId).map((f) => {
        if (f.id !== farmId) return f;
        const plots = [...f.plots, plot];
        return {
          ...f,
          plots,
          primaryCrops: [...new Set(plots.map((p) => p.crop))],
          totalAcres: plots.reduce((sum, p) => sum + p.acres, 0),
        };
      });
      saveLocalFarms(farms, userId);
      return plot;
    }

    const plot: FarmPlot = {
      id: `local-field-${Date.now()}`,
      name: input.name,
      crop: input.crop,
      variety: input.variety || '',
      acres: input.areaAcres,
      growthStage: input.growthStage || '',
      soilType: input.soilType || '',
      rootDepth: '',
      healthStatus: 'optimal',
      currentMoisture: input.soilMoisture ?? 30,
      targetMoisture: 45,
    };

    const farms = getLocalFarms(userId).map((f) => {
      if (f.id !== farmId) return f;
      const plots = [...f.plots, plot];
      return {
        ...f,
        plots,
        primaryCrops: [...new Set(plots.map((p) => p.crop))],
        totalAcres: plots.reduce((sum, p) => sum + p.acres, 0),
      };
    });
    saveLocalFarms(farms, userId);
    return plot;
  },

  async deleteField(
    token: string | null,
    farmId: string,
    fieldId: string,
    userId?: string | null
  ): Promise<void> {
    if (token && !farmId.startsWith('local-') && !fieldId.startsWith('local-')) {
      await apiRequestWithAuth(`/farms/${farmId}/fields/${fieldId}`, { method: 'DELETE' }, token);
    }

    const farms = getLocalFarms(userId).map((f) => {
      if (f.id !== farmId) return f;
      const plots = f.plots.filter((p) => p.id !== fieldId);
      return {
        ...f,
        plots,
        primaryCrops: [...new Set(plots.map((p) => p.crop))],
        totalAcres: plots.reduce((sum, p) => sum + p.acres, 0),
      };
    });
    saveLocalFarms(farms, userId);
  },

  async getTodayActions(isDemo = false): Promise<ActionItem[]> {
    if (!isDemo) {
      return getStoredItem<ActionItem[]>(ACTIONS_STORAGE_KEY, []);
    }
    return getStoredItem<ActionItem[]>(ACTIONS_STORAGE_KEY, TODAY_ACTIONS);
  },

  async toggleAction(id: string): Promise<ActionItem[]> {
    const currentActions = await this.getTodayActions(true);
    const updated = currentActions.map((act) =>
      act.id === id ? { ...act, completed: !act.completed } : act
    );
    setStoredItem(ACTIONS_STORAGE_KEY, updated);
    return updated;
  },

  async addAction(action: ActionItem): Promise<ActionItem[]> {
    const currentActions = await this.getTodayActions(true);
    const updated = [action, ...currentActions];
    setStoredItem(ACTIONS_STORAGE_KEY, updated);
    return updated;
  },

  async getNotifications(isDemo = false): Promise<AppNotification[]> {
    if (!isDemo) {
      return getStoredItem<AppNotification[]>(NOTIFICATIONS_STORAGE_KEY, []);
    }
    return getStoredItem<AppNotification[]>(NOTIFICATIONS_STORAGE_KEY, INITIAL_NOTIFICATIONS);
  },

  async markNotificationAsRead(id: string): Promise<AppNotification[]> {
    const notifications = await this.getNotifications();
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setStoredItem(NOTIFICATIONS_STORAGE_KEY, updated);
    return updated;
  },

  async markAllNotificationsAsRead(): Promise<AppNotification[]> {
    const notifications = await this.getNotifications();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setStoredItem(NOTIFICATIONS_STORAGE_KEY, updated);
    return updated;
  },
};
