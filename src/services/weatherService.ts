import { WeatherCondition, HourlyForecast, DailyForecast } from '../types';
import { CURRENT_WEATHER, HOURLY_FORECASTS, DAILY_FORECASTS } from '../data/mockData';

export const weatherService = {
  async getCurrentWeather(): Promise<WeatherCondition> {
    return CURRENT_WEATHER;
  },

  async getHourlyForecast(): Promise<HourlyForecast[]> {
    return HOURLY_FORECASTS;
  },

  async getDailyForecast(): Promise<DailyForecast[]> {
    return DAILY_FORECASTS;
  },
};
