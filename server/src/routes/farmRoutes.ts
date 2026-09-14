import { Router } from 'express';
import {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
  getFarmOverview,
} from '../controllers/farmController.js';
import fieldRoutes from './fieldRoutes.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All farm endpoints require authentication
router.use(authenticate);

// Nested Field routes under a specific farm: /api/v1/farms/:farmId/fields
router.use('/:farmId/fields', fieldRoutes);

router.post('/', createFarm);
router.get('/', getFarms);
router.get('/:farmId/overview', getFarmOverview);
router.get('/:farmId', getFarmById);
router.patch('/:farmId', updateFarm);
router.delete('/:farmId', deleteFarm);

export default router;
