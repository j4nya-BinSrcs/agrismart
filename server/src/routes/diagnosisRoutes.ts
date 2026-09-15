import { Router } from 'express';
import {
  analyzeCrop,
  getHistory,
  getById,
  saveDiagnosis,
  exportReport,
} from '../controllers/diagnosisController.js';
import { requireBodyFields } from '../middleware/validator.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/diagnosis/analyze
router.post(
  '/analyze',
  requireBodyFields(['imageUrl', 'crop', 'growthStage', 'fieldLocation']),
  analyzeCrop
);

// POST /api/v1/diagnosis/report — Generate & download a PDF diagnostic report
router.post('/report', requireBodyFields(['id', 'crop']), exportReport);

// GET /api/v1/diagnosis/history
router.get('/history', getHistory);

// POST /api/v1/diagnosis (Save / bookmark)
router.post('/', requireBodyFields(['id', 'crop']), saveDiagnosis);

// GET /api/v1/diagnosis/:id
router.get('/:id', getById);

export default router;
