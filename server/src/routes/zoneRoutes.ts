import { Router } from 'express';
import {
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone,
} from '../controllers/zoneController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All zone endpoints require authentication
router.use(authenticate);

router.post('/', createZone);
router.get('/', getZones);
router.get('/:zoneId', getZoneById);
router.patch('/:zoneId', updateZone);
router.delete('/:zoneId', deleteZone);

export default router;
