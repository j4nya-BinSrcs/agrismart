import { Farm, ActionItem, AppNotification } from '../types';
import { TODAY_ACTIONS, INITIAL_NOTIFICATIONS } from '../data/mockData';
import { getStoredItem, setStoredItem, clearAllStoredData } from '../utils/storage';
import { apiRequestWithAuth, ApiError } from './apiClient';

export const DEFAULT_FARM: Farm = {
  id: 'farm-patel-anand',
  name: 'Patel Farm',
  owner: 'Ramesh Patel',
  location: 'Anand, Gujarat',
  totalAcres: 18.5,
  primaryCrops: ['Tomato (Plot 2)', 'Cotton (Block 1)', 'Wheat (East)'],
  plots: [
    {
      id: 'plot-tomato',
      name: 'Field A (Plot 2)',
      crop: 'Tomato',
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
      id: 'plot-cotton',
      name: 'Field B (Block 1)',
      crop: 'Cotton',
      variety: 'Bt Cotton Hybrid',
      acres: 8.0,
      growthStage: 'Squaring (Vegetative)',
      soilType: 'Clay Loam',
      rootDepth: '60 cm',
      healthStatus: 'optimal',
      currentMoisture: 48,
      targetMoisture: 50,
    },
    {
      id: 'plot-wheat',
      name: 'Field C (East)',
      crop: 'Wheat',
      variety: 'GW-496',
      acres: 4.5,
      growthStage: 'Tillering Stage',
      soilType: 'Loam',
      rootDepth: '30 cm',
      healthStatus: 'optimal',
      currentMoisture: 26,
      targetMoisture: 40,
    },
  ],
};

const ACTIONS_STORAGE_KEY = 'actions_list';
const NOTIFICATIONS_STORAGE_KEY = 'notifications_list';

interface BackendFarm {
  id: string;
  owner: string;
  name: string;
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  totalAreaAcres: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendFarmListResponse {
  farms: BackendFarm[];
}

function mapBackendFarmToClient(backendFarm: BackendFarm): Farm {
  return {
    id: backendFarm.id,
    name: backendFarm.name,
    owner: backendFarm.owner,
    location: backendFarm.location.address || 'Unknown location',
    totalAcres: backendFarm.totalAreaAcres,
    primaryCrops: [],
    plots: [],
  };
}

export const farmService = {
  async getFarmDetails(token: string | null): Promise<Farm> {
    if (token) {
      try {
        const response = await apiRequestWithAuth<BackendFarmListResponse>('/farms', {}, token);
        if (response.farms && response.farms.length > 0) {
          return mapBackendFarmToClient(response.farms[0]);
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 0) {
          // Network error - backend unavailable, fall back to local
        } else if (err instanceof ApiError && err.statusCode === 401) {
          // Unauthorized - token invalid, fall back to local
        }
      }
    }
    // Offline fallback or no token
    return DEFAULT_FARM;
  },

  async getTodayActions(): Promise<ActionItem[]> {
    return getStoredItem<ActionItem[]>(ACTIONS_STORAGE_KEY, TODAY_ACTIONS);
  },

  async toggleAction(id: string): Promise<ActionItem[]> {
    const currentActions = await this.getTodayActions();
    const updated = currentActions.map((act) =>
      act.id === id ? { ...act, completed: !act.completed } : act
    );
    setStoredItem(ACTIONS_STORAGE_KEY, updated);
    return updated;
  },

  async addAction(action: ActionItem): Promise<ActionItem[]> {
    const currentActions = await this.getTodayActions();
    const updated = [action, ...currentActions];
    setStoredItem(ACTIONS_STORAGE_KEY, updated);
    return updated;
  },

  async getNotifications(): Promise<AppNotification[]> {
    return getStoredItem<AppNotification[]>(NOTIFICATIONS_STORAGE_KEY, INITIAL_NOTIFICATIONS);
  },

  async markNotificationAsRead(id: string): Promise<AppNotification[]> {
    const notifications = await this.getNotifications();
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setStoredItem(NOTIFICATIONS_STORAGE_KEY, updated);
    return updated;
  },

  async markAllNotificationsAsRead(): Promise<AppNotification[]> {
    const notifications = await this.getNotifications();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setStoredItem(NOTIFICATIONS_STORAGE_KEY, updated);
    return updated;
  },

  async resetDemoData(): Promise<void> {
    clearAllStoredData();
  },
};
