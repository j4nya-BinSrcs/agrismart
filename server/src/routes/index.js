import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import diagnosisRoutes from './diagnosisRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import irrigationRoutes from './irrigationRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import authRoutes from './authRoutes.js';
import farmRoutes from './farmRoutes.js';
import sustainabilityRoutes from './sustainabilityRoutes.js';

const router = Router();

// Mount foundational routes
router.use('/health', healthRoutes);
router.use('/diagnosis', diagnosisRoutes);
router.use('/weather', weatherRoutes);
router.use('/irrigation', irrigationRoutes);
router.use('/assistant', assistantRoutes);
router.use('/auth', authRoutes);
router.use('/farms', farmRoutes);
router.use('/sustainability', sustainabilityRoutes);

export default router;
