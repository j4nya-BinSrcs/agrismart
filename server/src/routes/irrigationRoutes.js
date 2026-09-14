import { Router } from 'express';
import { getIrrigationPlan } from '../controllers/irrigationController.js';

const router = Router();

// POST /api/v1/irrigation/plan
router.post('/plan', getIrrigationPlan);

export default router;
