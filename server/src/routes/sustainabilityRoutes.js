import { Router } from 'express';
import { getSustainabilitySummary } from '../controllers/sustainabilityController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All sustainability routes require authentication
router.use(authenticate);

// GET /api/v1/sustainability/summary
router.get('/summary', getSustainabilitySummary);

export default router;
