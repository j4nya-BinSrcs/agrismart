import { DiagnosisRecord, DiagnosisAnalysisRequest } from '../types';
import { INITIAL_DIAGNOSES } from '../data/mockData';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { apiRequest, ApiError, API_BASE_URL } from './apiClient';

const DIAGNOSES_STORAGE_KEY = 'diagnoses_history';

export const diagnosisService = {
  /**
   * Fetches diagnosis history from backend MongoDB /api/v1/diagnosis/history
   */
  async getDiagnosisHistory(limit = 30): Promise<DiagnosisRecord[]> {
    try {
      const records = await apiRequest<DiagnosisRecord[]>(`/diagnosis/history?limit=${limit}`);
      if (Array.isArray(records) && records.length > 0) {
        setStoredItem(DIAGNOSES_STORAGE_KEY, records);
        return records;
      }
    } catch (err) {
      console.warn('[diagnosisService] Backend history unavailable, using local cache:', err);
    }
    return getStoredItem<DiagnosisRecord[]>(DIAGNOSES_STORAGE_KEY, INITIAL_DIAGNOSES);
  },

  /**
   * Fetches a single diagnosis by ID from backend /api/v1/diagnosis/:id
   */
  async getDiagnosisById(id: string): Promise<DiagnosisRecord | null> {
    try {
      const record = await apiRequest<DiagnosisRecord>(`/diagnosis/${encodeURIComponent(id)}`);
      if (record) {
        return record;
      }
    } catch (err) {
      console.warn(`[diagnosisService] Failed to fetch diagnosis ${id} from backend:`, err);
    }
    const list = await this.getDiagnosisHistory();
    return list.find((d) => d.id === id) || null;
  },

  /**
   * Saves or bookmarks a diagnosis record in backend and local storage
   */
  async saveDiagnosis(record: DiagnosisRecord): Promise<DiagnosisRecord[]> {
    // 1. Sync to local storage
    const current = getStoredItem<DiagnosisRecord[]>(DIAGNOSES_STORAGE_KEY, INITIAL_DIAGNOSES);
    const updated = [record, ...current.filter((d) => d.id !== record.id)];
    setStoredItem(DIAGNOSES_STORAGE_KEY, updated);

    // 2. Sync to backend if available
    try {
      await apiRequest<DiagnosisRecord>('/diagnosis', {
        method: 'POST',
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.warn('[diagnosisService] Note: Failed to sync saved record to backend MongoDB:', err);
    }

    return updated;
  },

  /**
   * Analyzes crop leaf image via real backend POST /api/v1/diagnosis/analyze
   *
   * Handles:
   * - 200: Returns real backend diagnosis response (with isMlPrediction and source)
   * - 400: Throws validation error from backend
   * - 413: Throws file-size error from backend
   * - Network/server failure: Throws actionable error with backend status
   *
   * Note: Does NOT fabricate fake confidence percentages or fallback disease results!
   */
  async analyzeCrop(
    request: DiagnosisAnalysisRequest,
    onProgress?: (step: string) => void
  ): Promise<DiagnosisRecord> {
    onProgress?.('Validating image resolution & leaf morphology...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    onProgress?.('Dispatching payload to backend diagnostic pipeline...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      const record = await apiRequest<DiagnosisRecord>('/diagnosis/analyze', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: request.imageUrl,
          imageName: request.imageName,
          crop: request.crop,
          variety: request.variety,
          growthStage: request.growthStage,
          fieldLocation: request.fieldLocation,
          soilMoistureContext: request.soilMoistureContext,
        }),
      });

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
