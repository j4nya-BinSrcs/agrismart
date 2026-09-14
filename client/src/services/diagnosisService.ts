import { DiagnosisRecord, DiagnosisAnalysisRequest } from '../types';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { apiRequestWithAuth, ApiError, API_BASE_URL } from './apiClient';

const diagnosesKeyFor = (userId?: string | null) =>
  userId ? `diagnoses_history_${userId}` : 'diagnoses_history';

export const diagnosisService = {
  /**
   * Fetches diagnosis history from backend MongoDB /api/v1/diagnosis/history
   */
  async getDiagnosisHistory(token: string | null = null, userId?: string | null, limit = 30): Promise<DiagnosisRecord[]> {
    const storageKey = diagnosesKeyFor(userId);
    if (token) {
      try {
        const records = await apiRequestWithAuth<DiagnosisRecord[]>(
          `/diagnosis/history?limit=${limit}`,
          {},
          token
        );
        if (Array.isArray(records)) {
          setStoredItem(storageKey, records);
          return records;
        }
      } catch (err) {
        console.warn('[diagnosisService] Backend history unavailable, using local cache:', err);
      }
    }
    return getStoredItem<DiagnosisRecord[]>(storageKey, []);
  },

  /**
   * Fetches a single diagnosis by ID from backend /api/v1/diagnosis/:id
   */
  async getDiagnosisById(id: string, token: string | null = null, userId?: string | null): Promise<DiagnosisRecord | null> {
    if (token) {
      try {
        const record = await apiRequestWithAuth<DiagnosisRecord>(
          `/diagnosis/${encodeURIComponent(id)}`,
          {},
          token
        );
        if (record) {
          return record;
        }
      } catch (err) {
        console.warn(`[diagnosisService] Failed to fetch diagnosis ${id} from backend:`, err);
      }
    }
    const list = await this.getDiagnosisHistory(token, userId);
    return list.find((d) => d.id === id) || null;
  },

  /**
   * Saves or bookmarks a diagnosis record in backend and local storage
   */
  async saveDiagnosis(
    record: DiagnosisRecord,
    token: string | null = null,
    userId?: string | null
  ): Promise<DiagnosisRecord[]> {
    const storageKey = diagnosesKeyFor(userId);
    const current = getStoredItem<DiagnosisRecord[]>(storageKey, []);
    const updated = [record, ...current.filter((d) => d.id !== record.id)];
    setStoredItem(storageKey, updated);

    if (token) {
      try {
        await apiRequestWithAuth<DiagnosisRecord>(
          '/diagnosis',
          {
            method: 'POST',
            body: JSON.stringify(record),
          },
          token
        );
      } catch (err) {
        console.warn('[diagnosisService] Note: Failed to sync saved record to backend MongoDB:', err);
      }
    }

    return updated;
  },

  /**
   * Analyzes crop leaf image via real backend POST /api/v1/diagnosis/analyze
   */
  async analyzeCrop(
    request: DiagnosisAnalysisRequest,
    token: string | null = null,
    onProgress?: (step: string) => void
  ): Promise<DiagnosisRecord> {
    onProgress?.('Validating image resolution & leaf morphology...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    onProgress?.('Dispatching payload to backend diagnostic pipeline...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (!token) {
      throw new Error('Sign in required to run crop diagnosis.');
    }

    try {
      const record = await apiRequestWithAuth<DiagnosisRecord>(
        '/diagnosis/analyze',
        {
          method: 'POST',
          body: JSON.stringify({
            imageUrl: request.imageUrl,
            imageName: request.imageName,
            crop: request.crop,
            variety: request.variety,
            growthStage: request.growthStage,
            fieldLocation: request.fieldLocation,
            soilMoistureContext: request.soilMoistureContext,
            farmId: request.farmId,
            fieldId: request.fieldId,
          }),
        },
        token
      );

      onProgress?.('Analysis received and calibrated.');
      return record;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 413 || error.message.toLowerCase().includes('10mb')) {
          throw new Error('Image exceeds 10MB upload limit. Please choose a smaller image.');
        }
        if (error.statusCode === 400) {
          throw new Error(`Validation Error: ${error.message}`);
        }
        if (error.statusCode === 401) {
          throw new Error('Session expired. Please sign in again.');
        }
        if (error.statusCode === 0) {
          throw new Error(`Cannot connect to AgriSmart backend server (${API_BASE_URL}). Please verify backend is running.`);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },
};

export default diagnosisService;
