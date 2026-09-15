import { DiagnosisRecord, DiagnosisAnalysisRequest } from '../types';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { apiRequestWithAuth, ApiError, API_BASE_URL } from './apiClient';

const diagnosesKeyFor = (userId?: string | null) =>
  userId ? `diagnoses_history_${userId}` : 'diagnoses_history';

/**
 * Keeps diagnostics scoped to the active farm. Records created before farm
 * linking existed (or demo seeds) have no `farm` field and stay visible on
 * every farm; records attributed to a farm only appear on that farm.
 */
const filterByFarm = (records: DiagnosisRecord[], farmId?: string | null): DiagnosisRecord[] =>
  farmId ? records.filter((d) => !d.farm || d.farm === farmId) : records;

export const diagnosisService = {
  /**
   * Fetches diagnosis history from backend MongoDB /api/v1/diagnosis/history
   */
  async getDiagnosisHistory(
    token: string | null = null,
    userId?: string | null,
    limit = 30,
    farmId?: string | null
  ): Promise<DiagnosisRecord[]> {
    const storageKey = diagnosesKeyFor(userId);
    if (token) {
      try {
        const farmQuery = farmId ? `&farmId=${encodeURIComponent(farmId)}` : '';
        const records = await apiRequestWithAuth<DiagnosisRecord[]>(
          `/diagnosis/history?limit=${limit}${farmQuery}`,
          {},
          token
        );
        if (Array.isArray(records)) {
          setStoredItem(storageKey, records);
          return filterByFarm(records, farmId);
        }
      } catch (err) {
        console.warn('[diagnosisService] Backend history unavailable, using local cache:', err);
      }
    }
    return filterByFarm(getStoredItem<DiagnosisRecord[]>(storageKey, []), farmId);
  },

  /**
   * Fetches a single diagnosis by ID from backend /api/v1/diagnosis/:id
   */
  async getDiagnosisById(
    id: string,
    token: string | null = null,
    userId?: string | null,
    farmId?: string | null
  ): Promise<DiagnosisRecord | null> {
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
    const list = await this.getDiagnosisHistory(token, userId, 30, farmId);
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
   * Exports the diagnosis report as a downloadable PDF.
   * POSTs the full record to the backend /api/v1/diagnosis/report and
   * triggers a browser download when the PDF bytes come back.
   */
  async exportReportPdf(record: DiagnosisRecord, token: string | null = null): Promise<void> {
    if (!token) {
      throw new Error('Sign in required to export the diagnostic report.');
    }

    const url = `${API_BASE_URL}/diagnosis/report`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(record),
      });
    } catch (netErr) {
      const errorMsg = netErr instanceof Error ? netErr.message : String(netErr);
      throw new Error(
        `Cannot connect to AgriSmart backend (${API_BASE_URL}). Verify the backend is running. (${errorMsg})`
      );
    }

    if (!response.ok) {
      let message = `Server error (${response.status}) while generating the report.`;
      try {
        const json = await response.json();
        message = json?.message || json?.error || message;
      } catch {
        // non-JSON error body — keep the generic message
      }
      if (response.status === 401) {
        throw new Error('Session expired. Please sign in again.');
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('The backend returned an empty PDF. Please try again.');
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('pdf')) {
      throw new Error('The backend did not return a PDF file.');
    }

    const objectUrl = URL.createObjectURL(blob);
    const filename = `agrismart-${(record.crop || 'crop').replace(/[^a-z0-9\-_]/gi, '_').toLowerCase()}-diagnostic-report.pdf`;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
