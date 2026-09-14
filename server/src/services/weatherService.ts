import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 5000;

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

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const isAbortError = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'name' in err &&
  (err as { name?: unknown }).name === 'AbortError';

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

export const weatherService = {
  /**
   * Fetches weather forecast from Open-Meteo
   */
  async getForecast(latParam: unknown, lonParam: unknown) {
    // 1. Resolve coordinates (defaulting to Anand, Gujarat if omitted)
    const lat = latParam !== undefined && latParam !== null && latParam !== ''
      ? latParam
      : config.weather.defaultLatitude;
    const lon = lonParam !== undefined && lonParam !== null && lonParam !== ''
      ? lonParam
      : config.weather.defaultLongitude;

    const { latitude, longitude } = validateCoordinates(lat, lon);

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

    // 3. Dispatch HTTP request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(targetUrl, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeoutId);
      if (isAbortError(err)) {
        logger.error(`Open-Meteo request timed out after ${REQUEST_TIMEOUT_MS}ms for [${latitude}, ${longitude}]`);
        throw ApiError.internal('Weather service request timed out. Please try again.');
      }
      logger.error(`Open-Meteo network connectivity failed: ${getErrorMessage(err)}`);
      throw ApiError.internal(`Failed to connect to weather data provider: ${getErrorMessage(err)}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      logger.error(`Open-Meteo returned HTTP ${response.status}: ${errorText}`);
      throw ApiError.internal(`Weather provider error (${response.status}): ${errorText || 'Upstream request failed'}`);
    }

    let payload: OpenMeteoRawPayload | null = null;
    try {
      payload = (await response.json()) as OpenMeteoRawPayload | null;
    } catch (jsonErr) {
      logger.error(`Failed to parse Open-Meteo response JSON: ${getErrorMessage(jsonErr)}`);
      throw ApiError.internal('Malformed response received from weather provider.');
    }

    // 4. Validate Provider Payload Integrity
    if (!payload || typeof payload !== 'object' || !payload.current) {
      logger.error('Invalid payload structure received from Open-Meteo');
      throw ApiError.internal('Weather data provider returned an incomplete payload.');
    }

    const { current, hourly, daily } = payload;
    const condition = mapWmoCodeToCondition(current.weather_code);
    const currentRainProb = daily?.precipitation_probability_max?.[0] ?? ((current.rain ?? 0) > 0 ? 80 : 10);
    const rainfallExpectedMm = daily?.precipitation_sum?.[0] ?? current.precipitation ?? 0;

    // 5. Structure clean response
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
  },
};

export default weatherService;
