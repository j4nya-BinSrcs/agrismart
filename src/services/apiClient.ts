/**
 * Centralized API client for AgriSmart frontend
 * Reads VITE_API_URL or defaults to http://localhost:5000/api/v1
 */

export const API_BASE_URL: string =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL) ||
  'http://localhost:5000/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Standard HTTP JSON request helper with unified error extraction
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const errorMsg = netErr instanceof Error ? netErr.message : String(netErr);
    throw new ApiError(
      `Unable to connect to backend service at ${API_BASE_URL}. Please ensure backend is running. (${errorMsg})`,
      0
    );
  }

  let jsonResponse: any;
  const textResponse = await response.text();
  try {
    jsonResponse = textResponse ? JSON.parse(textResponse) : null;
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const message =
      jsonResponse?.message ||
      jsonResponse?.error ||
      `Server error (${response.status}): ${response.statusText || textResponse || 'Unknown error'}`;
    throw new ApiError(message, response.status, jsonResponse?.data || jsonResponse);
  }

  if (jsonResponse && typeof jsonResponse === 'object' && 'data' in jsonResponse) {
    return jsonResponse.data as T;
  }

  return jsonResponse as T;
}
