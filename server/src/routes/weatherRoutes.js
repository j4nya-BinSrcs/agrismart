import { Router } from 'express';
import { getWeatherForecast } from '../controllers/weatherController.js';

const router = Router();

// GET /api/v1/weather
router.get('/', getWeatherForecast);

export default router;
