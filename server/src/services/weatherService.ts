import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS) || 15000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;
const CACHE_TTL_MS = Number(process.env.WEATHER_CACHE_TTL_MS) || 10 * 60 * 1000;

interface OpenMeteoHourly {
  time: string[];
  temperature_2m?: (number | null)[];
  relative_humidity_2m?: (number | null)[];
  precipitation_probability?: (number | null)[];
  precipitation?: (number | null)[];
  weather_code?: (number | null)[];
  wind_speed_10m?: (number | null)[];
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  weather_code?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
  uv_index_max?: (number | null)[];
}

interface OpenMeteoCurrent {
  weather_code?: number;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  wind_speed_10m?: number;
  uv_index?: number;
  precipitation?: number;
  rain?: number;
  time?: string;
}

interface OpenMeteoRawPayload {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  elevation?: number;
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
  daily?: OpenMeteoDaily;
}

type WeatherForecastResult = {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    elevationMeters: number | null;
  };
  current: {
    temperature: number | null;
    feelsLike: number | null;
    condition: string;
    weatherCode: number;
    humidity: number | null;
    windSpeedKmH: number | null;
    uvIndex: number | null;
    precipitationMm: number;
    rainfallExpectedMm: number;
    rainProbability: number;
    forecastSummary: string;
    updatedAt: string;
  };
  hourly: ReturnType<typeof formatHourlyData>;
  daily: ReturnType<typeof formatDailyData>;
  provider: string;
  cached?: boolean;
  stale?: boolean;
};

interface CacheEntry {
  expiresAt: number;
  data: WeatherForecastResult;
}

const forecastCache = new Map<string, CacheEntry>();

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const isAbortError = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'name' in err &&
  (err as { name?: unknown }).name === 'AbortError';

const cacheKeyFor = (latitude: number, longitude: number) =>
  `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Maps WMO weather interpretation code to clear description
 */
export const mapWmoCodeToCondition = (code: unknown): string => {
  const codeNum = Number(code);
  switch (codeNum) {
    case 0:
      return 'Clear Sky';
    case 1:
      return 'Mainly Clear';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Foggy';
    case 51:
      return 'Light Drizzle';
    case 53:
      return 'Moderate Drizzle';
    case 55:
      return 'Dense Drizzle';
    case 56:
    case 57:
      return 'Freezing Drizzle';
    case 61:
      return 'Light Rain';
    case 63:
      return 'Moderate Rain';
    case 65:
      return 'Heavy Rain';
    case 66:
    case 67:
      return 'Freezing Rain';
    case 71:
      return 'Slight Snow';
    case 73:
      return 'Moderate Snow';
    case 75:
      return 'Heavy Snow';
    case 77:
      return 'Snow Grains';
    case 80:
      return 'Light Rain Showers';
    case 81:
      return 'Moderate Rain Showers';
    case 82:
      return 'Violent Rain Showers';
    case 85:
    case 86:
      return 'Snow Showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Thunderstorm with Hail';
    default:
      return 'Partly Cloudy';
  }
};

/**
 * Validates latitude and longitude ranges
 */
export const validateCoordinates = (latInput: unknown, lonInput: unknown) => {
  const lat = parseFloat(String(latInput));
  const lon = parseFloat(String(lonInput));

  if (isNaN(lat) || typeof lat !== 'number') {
    throw ApiError.badRequest(`Invalid latitude value: '${latInput}'. Must be a valid floating-point number between -90 and 90.`);
  }

  if (isNaN(lon) || typeof lon !== 'number') {
    throw ApiError.badRequest(`Invalid longitude value: '${lonInput}'. Must be a valid floating-point number between -180 and 180.`);
  }

  if (lat < -90 || lat > 90) {
    throw ApiError.badRequest(`Latitude out of range: ${lat}. Must be between -90.0 and 90.0.`);
  }

  if (lon < -180 || lon > 180) {
    throw ApiError.badRequest(`Longitude out of range: ${lon}. Must be between -180.0 and 180.0.`);
  }

  return { latitude: lat, longitude: lon };
};

/**
 * Formats 24-hour hourly items
 */
const formatHourlyData = (hourly: OpenMeteoHourly | undefined, startIndex: number, count = 24) => {
  if (!hourly || !Array.isArray(hourly.time)) {
    return [];
  }

  const result = [];
  const total = Math.min(hourly.time.length, startIndex + count);

  for (let i = startIndex; i < total; i++) {
    const rawTime = hourly.time[i];
    const dateObj = new Date(rawTime);
    const timeFormatted = isNaN(dateObj.getTime())
      ? rawTime
      : dateObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

    result.push({
      time: timeFormatted,
      isoTime: rawTime,
      temp: hourly.temperature_2m?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
      rainProbability: hourly.precipitation_probability?.[i] ?? 0,
      precipitationMm: hourly.precipitation?.[i] ?? 0,
      windSpeedKmH: hourly.wind_speed_10m?.[i] ?? null,
      condition: mapWmoCodeToCondition(hourly.weather_code?.[i]),
      weatherCode: hourly.weather_code?.[i] ?? 0,
    });
  }

  return result;
};

/**
 * Formats daily forecast items
 */
const formatDailyData = (daily: OpenMeteoDaily | undefined) => {
  if (!daily || !Array.isArray(daily.time)) {
    return [];
  }

  const result = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < daily.time.length; i++) {
    const rawDate = daily.time[i];
    const dateObj = new Date(rawDate);
    const isToday = i === 0;

    let dayLabel = isToday ? 'Today' : 'Upcoming';
    let dateLabel = rawDate;

    if (!isNaN(dateObj.getTime())) {
      dayLabel = isToday ? 'Today' : daysOfWeek[dateObj.getDay()];
      dateLabel = `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
    }

    result.push({
      day: dayLabel,
      date: dateLabel,
      isoDate: rawDate,
      maxTemp: daily.temperature_2m_max?.[i] ?? null,
      minTemp: daily.temperature_2m_min?.[i] ?? null,
      condition: mapWmoCodeToCondition(daily.weather_code?.[i]),
      weatherCode: daily.weather_code?.[i] ?? 0,
      rainProbability: daily.precipitation_probability_max?.[i] ?? 0,
      rainfallMm: daily.precipitation_sum?.[i] ?? 0,
      uvIndexMax: daily.uv_index_max?.[i] ?? null,
    });
  }

  return result;
};

const INDIAN_DISTRICT_COORDS: Record<string, { lat: number; lon: number }> = {
  anand: { lat: 22.5645, lon: 72.9289 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  amreli: { lat: 21.6032, lon: 71.2221 },
  banaskantha: { lat: 24.1724, lon: 72.4346 },
  bharuch: { lat: 21.7051, lon: 72.9959 },
  bhavnagar: { lat: 21.7645, lon: 72.1519 },
  gandhinagar: { lat: 23.2156, lon: 72.6369 },
  jamnagar: { lat: 22.4707, lon: 70.0577 },
  junagadh: { lat: 21.5222, lon: 70.4579 },
  kheda: { lat: 22.6939, lon: 72.8604 },
  kutch: { lat: 23.242, lon: 69.6669 },
  mehsana: { lat: 23.588, lon: 72.3693 },
  navsari: { lat: 20.9467, lon: 72.952 },
  panchmahal: { lat: 22.7749, lon: 73.6143 },
  rajkot: { lat: 22.3039, lon: 70.8022 },
  sabarkantha: { lat: 23.5979, lon: 72.9698 },
  surat: { lat: 21.1702, lon: 72.8311 },
  vadodara: { lat: 22.3072, lon: 73.1812 },
  valsad: { lat: 20.5992, lon: 72.9342 },
  pune: { lat: 18.5204, lon: 73.8567 },
  nashik: { lat: 19.9975, lon: 73.7898 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  ludhiana: { lat: 30.901, lon: 75.8573 },
  amritsar: { lat: 31.634, lon: 74.8723 },
  agra: { lat: 27.1767, lon: 78.0081 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  indore: { lat: 22.7196, lon: 75.8577 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
};

const buildForecastResponse = (
  payload: OpenMeteoRawPayload,
  latitude: number,
  longitude: number
): WeatherForecastResult => {
  const { current, hourly, daily } = payload;
  if (!current) {
    throw ApiError.internal('Weather data provider returned an incomplete payload.');
  }

  const condition = mapWmoCodeToCondition(current.weather_code);
  const currentRainProb = daily?.precipitation_probability_max?.[0] ?? ((current.rain ?? 0) > 0 ? 80 : 10);
  const rainfallExpectedMm = daily?.precipitation_sum?.[0] ?? current.precipitation ?? 0;

  return {
    location: {
      latitude: payload.latitude ?? latitude,
      longitude: payload.longitude ?? longitude,
      timezone: payload.timezone ?? 'Asia/Kolkata',
      elevationMeters: payload.elevation ?? null,
    },
    current: {
      temperature: current.temperature_2m ?? null,
      feelsLike: current.apparent_temperature ?? current.temperature_2m ?? null,
      condition,
      weatherCode: current.weather_code ?? 0,
      humidity: current.relative_humidity_2m ?? null,
      windSpeedKmH: current.wind_speed_10m ?? null,
      uvIndex: current.uv_index ?? null,
      precipitationMm: current.precipitation ?? 0,
      rainfallExpectedMm,
      rainProbability: currentRainProb,
      forecastSummary: `${condition} with ${current.temperature_2m}°C and ${current.relative_humidity_2m}% humidity.`,
      updatedAt: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
    },
    hourly: formatHourlyData(hourly, 0, 24),
    daily: formatDailyData(daily),
    provider: 'Open-Meteo',
  };
};

const fetchOpenMeteoOnce = async (targetUrl: string, latitude: number, longitude: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, { signal: controller.signal });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw ApiError.internal(`Weather provider error (${response.status}): ${errorText || 'Upstream request failed'}`);
    }

    let payload: OpenMeteoRawPayload | null = null;
    try {
      payload = (await response.json()) as OpenMeteoRawPayload | null;
    } catch (jsonErr) {
      logger.error(`Failed to parse Open-Meteo response JSON: ${getErrorMessage(jsonErr)}`);
      throw ApiError.internal('Malformed response received from weather provider.');
    }

    if (!payload || typeof payload !== 'object' || !payload.current) {
      logger.error('Invalid payload structure received from Open-Meteo');
      throw ApiError.internal('Weather data provider returned an incomplete payload.');
    }

    return buildForecastResponse(payload, latitude, longitude);
  } catch (err) {
    if (isAbortError(err)) {
      throw ApiError.internal(`Weather service request timed out after ${REQUEST_TIMEOUT_MS}ms. Please try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const weatherService = {
  /**
   * Fetches weather forecast from Open-Meteo (with retries + short TTL cache)
   */
  async getForecast(latParam?: unknown, lonParam?: unknown, districtParam?: unknown) {
    let targetLat = latParam;
    let targetLon = lonParam;

    if ((!targetLat || !targetLon) && districtParam && typeof districtParam === 'string') {
      const distClean = districtParam.toLowerCase().trim();
      const matchedKey = Object.keys(INDIAN_DISTRICT_COORDS).find((k) => distClean.includes(k) || k.includes(distClean));
      if (matchedKey) {
        targetLat = INDIAN_DISTRICT_COORDS[matchedKey].lat;
        targetLon = INDIAN_DISTRICT_COORDS[matchedKey].lon;
      }
    }

    // 1. Resolve coordinates (defaulting to Anand, Gujarat if omitted)
    const lat = targetLat !== undefined && targetLat !== null && targetLat !== ''
      ? targetLat
      : config.weather.defaultLatitude;
    const lon = targetLon !== undefined && targetLon !== null && targetLon !== ''
      ? targetLon
      : config.weather.defaultLongitude;

    const { latitude, longitude } = validateCoordinates(lat, lon);
    const cacheKey = cacheKeyFor(latitude, longitude);
    const cached = forecastCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, cached: true };
    }

    // 2. Build Open-Meteo Query
    const queryParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'rain',
        'weather_code',
        'wind_speed_10m',
        'uv_index',
      ].join(','),
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'precipitation_probability',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'uv_index_max',
      ].join(','),
      timezone: 'auto',
      forecast_days: '7',
    });

    const targetUrl = `${OPEN_METEO_BASE_URL}?${queryParams.toString()}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await fetchOpenMeteoOnce(targetUrl, latitude, longitude);
        forecastCache.set(cacheKey, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: result,
        });
        return result;
      } catch (err) {
        lastError = err;
        const isTimeout =
          (err instanceof ApiError && err.message.toLowerCase().includes('timed out')) ||
          isAbortError(err);
        const isNetwork =
          !(err instanceof ApiError) ||
          err.message.toLowerCase().includes('connect') ||
          err.message.toLowerCase().includes('fetch');

        if (attempt < MAX_RETRIES && (isTimeout || isNetwork)) {
          const delay = RETRY_BASE_DELAY_MS * (attempt + 1);
          logger.warn(
            `Open-Meteo attempt ${attempt + 1} failed for [${latitude}, ${longitude}]; retrying in ${delay}ms`
          );
          await sleep(delay);
          continue;
        }
        break;
      }
    }

    // Serve stale cache if available so the UI stays usable during outages
    if (cached) {
      logger.warn(`Serving stale weather cache for [${latitude}, ${longitude}] after upstream failure`);
      return { ...cached.data, cached: true, stale: true };
    }

    if (lastError instanceof ApiError) {
      if (lastError.message.toLowerCase().includes('timed out')) {
        logger.error(`Open-Meteo request timed out after ${REQUEST_TIMEOUT_MS}ms for [${latitude}, ${longitude}]`);
      } else {
        logger.error(`Open-Meteo request failed for [${latitude}, ${longitude}]: ${lastError.message}`);
      }
      throw lastError;
    }

    logger.error(`Open-Meteo network connectivity failed: ${getErrorMessage(lastError)}`);
    throw ApiError.internal(`Failed to connect to weather data provider: ${getErrorMessage(lastError)}`);
  },
};

export default weatherService;
