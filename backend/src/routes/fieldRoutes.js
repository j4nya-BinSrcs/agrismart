import { Router } from 'express';
import {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField,
} from '../controllers/fieldController.js';
import zoneRoutes from './zoneRoutes.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All field endpoints require authentication
router.use(authenticate);

// Nested Zone routes under a specific field: /api/v1/farms/:farmId/fields/:fieldId/zones
router.use('/:fieldId/zones', zoneRoutes);

router.post('/', createField);
router.get('/', getFields);
router.get('/:fieldId', getFieldById);
router.patch('/:fieldId', updateField);
router.delete('/:fieldId', deleteField);

export default router;
