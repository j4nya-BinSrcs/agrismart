import { Router } from 'express';
import {
  analyzeCrop,
  getHistory,
  getById,
  saveDiagnosis,
} from '../controllers/diagnosisController.js';
import { requireBodyFields } from '../middleware/validator.js';

const router = Router();

// POST /api/v1/diagnosis/analyze
router.post(
  '/analyze',
  requireBodyFields(['imageUrl', 'crop', 'growthStage', 'fieldLocation']),
  analyzeCrop
);

// GET /api/v1/diagnosis/history
router.get('/history', getHistory);

// POST /api/v1/diagnosis (Save / bookmark)
router.post('/', requireBodyFields(['id', 'crop']), saveDiagnosis);

// GET /api/v1/diagnosis/:id
router.get('/:id', getById);

export default router;
