import weatherService from '../services/weatherService.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getWeatherForecast = async (req, res, next) => {
  try {
    const lat = req.query.lat ?? req.query.latitude;
    const lon = req.query.lon ?? req.query.longitude;

    const data = await weatherService.getForecast(lat, lon);
    return ApiResponse.success(res, 200, 'Weather forecast data retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export default {
  getWeatherForecast,
};
