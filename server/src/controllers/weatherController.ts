import weatherService from '../services/weatherService.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AsyncHandler } from '../types/handlers.js';

const toSingleString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const getWeatherForecast: AsyncHandler = async (req, res, next) => {
  try {
    const lat = toSingleString(req.query.lat ?? req.query.latitude);
    const lon = toSingleString(req.query.lon ?? req.query.longitude);
    const district = toSingleString(req.query.district);

    const data = await weatherService.getForecast(lat, lon, district);
    return ApiResponse.success(res, 200, 'Weather forecast data retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export default {
  getWeatherForecast,
};