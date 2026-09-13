import { WeatherCondition, HourlyForecast, DailyForecast } from '../types';
import { apiRequest } from './apiClient';

export interface WeatherDataResponse {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    elevationMeters?: number | null;
  };
  current: {
    temperature: number;
    feelsLike: number;
    condition: string;
    weatherCode: number;
    humidity: number;
    windSpeedKmH: number;
    uvIndex: number;
    precipitationMm: number;
    rainfallExpectedMm: number;
    rainProbability: number;
    forecastSummary: string;
    updatedAt: string;
  };
  hourly: Array<{
    time: string;
    isoTime?: string;
    temp: number;
    humidity?: number | null;
    rainProbability: number;
    precipitationMm?: number;
    windSpeedKmH?: number | null;
    condition: string;
    weatherCode?: number;
  }>;
  daily: Array<{
    day: string;
    date: string;
    isoDate?: string;
    maxTemp: number;
    minTemp: number;
    condition: string;
    weatherCode?: number;
    rainProbability: number;
    rainfallMm: number;
    uvIndexMax?: number | null;
  }>;
  provider: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Transforms backend hourly telemetry by deriving agronomic spray suitability
 */
function enrichHourlyForecast(
  item: WeatherDataResponse['hourly'][0]
): HourlyForecast {
  const rainProb = item.rainProbability ?? 0;
  const wind = item.windSpeedKmH ?? 0;

  let spraySuitability: 'optimal' | 'caution' | 'unfavorable' = 'optimal';
  let sprayNote = 'Clear window (<12 km/h wind, no rain)';

  if (rainProb >= 60 || wind >= 20 || (item.precipitationMm && item.precipitationMm >= 2.0)) {
    spraySuitability = 'unfavorable';
    sprayNote = rainProb >= 60 ? 'Rain risk - chemical wash-off likely' : 'High wind drift (>20 km/h)';
  } else if (rainProb >= 30 || wind >= 13) {
    spraySuitability = 'caution';
    sprayNote = rainProb >= 30 ? 'Moderate rain probability - monitor window' : 'Breezy conditions (13-19 km/h)';
  }

  return {
    time: item.time,
    isoTime: item.isoTime,
    temp: Math.round(item.temp),
    rainProbability: rainProb,
    precipitationMm: item.precipitationMm,
    humidity: item.humidity,
    windSpeedKmH: item.windSpeedKmH,
    condition: item.condition,
    weatherCode: item.weatherCode,
    spraySuitability,
    sprayNote,
  };
}

/**
 * Transforms backend daily telemetry by deriving agronomic daily advisories
 */
function enrichDailyForecast(
  item: WeatherDataResponse['daily'][0]
): DailyForecast {
  const rainProb = item.rainProbability ?? 0;
  const rainfall = item.rainfallMm ?? 0;

  let farmAdvisory = 'Dry, clear skies. Ideal window for fertilizer application and tractor fieldwork.';
  if (rainProb >= 60 || rainfall >= 5.0) {
    farmAdvisory = `Heavy precipitation event (~${rainfall.toFixed(1)} mm). Suspend chemical sprays and hold irrigation.`;
  } else if (rainProb >= 30 || rainfall > 0.5) {
    farmAdvisory = `Scattered showers possible (~${rainfall.toFixed(1)} mm). Monitor foliage wetness and fungal risk.`;
  }

  return {
    day: item.day,
    date: item.date,
    isoDate: item.isoDate,
    maxTemp: Math.round(item.maxTemp),
    minTemp: Math.round(item.minTemp),
    condition: item.condition,
    weatherCode: item.weatherCode,
    rainProbability: rainProb,
    rainfallMm: rainfall,
    uvIndexMax: item.uvIndexMax,
    farmAdvisory,
  };
}

export const weatherService = {
  /**
   * Fetches the complete real-time forecast bundle from backend GET /api/v1/weather
   */
  async getFullForecast(coords?: Coordinates): Promise<{
    current: WeatherCondition;
    hourly: HourlyForecast[];
    daily: DailyForecast[];
    location: WeatherDataResponse['location'];
    provider: string;
  }> {
    const query = coords ? `?lat=${coords.latitude}&lon=${coords.longitude}` : '';
    const raw = await apiRequest<WeatherDataResponse>(`/weather${query}`);

    const currentCondition: WeatherCondition = {
      temperature: Math.round(raw.current.temperature),
      feelsLike: Math.round(raw.current.feelsLike),
      condition: raw.current.condition,
      rainProbability: raw.current.rainProbability,
      humidity: raw.current.humidity,
      windSpeedKmH: raw.current.windSpeedKmH,
      uvIndex: raw.current.uvIndex,
      forecastSummary: raw.current.forecastSummary,
      agriculturalAdvice:
        raw.current.rainProbability >= 60
          ? `Precipitation probability is ${raw.current.rainProbability}% (~${raw.current.rainfallExpectedMm} mm). High wash-off risk. Delay chemical sprays.`
          : `Mild conditions. Evapotranspiration is stable. Optimal operational spray window.`,
      rainfallExpectedMm: raw.current.rainfallExpectedMm,
      precipitationMm: raw.current.precipitationMm,
      weatherCode: raw.current.weatherCode,
      location: raw.location,
      provider: raw.provider,
      updatedAt: raw.current.updatedAt,
    };

    const hourly = raw.hourly.map(enrichHourlyForecast);
    const daily = raw.daily.map(enrichDailyForecast);

    return {
      current: currentCondition,
      hourly,
      daily,
      location: raw.location,
      provider: raw.provider,
    };
  },

  /**
   * Fetches current weather from backend
   */
  async getCurrentWeather(coords?: Coordinates): Promise<WeatherCondition> {
    const bundle = await this.getFullForecast(coords);
    return bundle.current;
  },

  /**
   * Fetches hourly forecast from backend
   */
  async getHourlyForecast(coords?: Coordinates): Promise<HourlyForecast[]> {
    const bundle = await this.getFullForecast(coords);
    return bundle.hourly;
  },

  /**
   * Fetches 7-day daily forecast from backend
   */
  async getDailyForecast(coords?: Coordinates): Promise<DailyForecast[]> {
    const bundle = await this.getFullForecast(coords);
    return bundle.daily;
  },
};

export default weatherService;
