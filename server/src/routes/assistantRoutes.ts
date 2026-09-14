import { Router } from 'express';
import assistantController from '../controllers/assistantController.js';

const router = Router();

/**
 * @route   POST /api/v1/assistant
 * @desc    Generate farmer advisory response grounded in telemetry with Gemini LLM
 * @access  Public
 */
router.post('/', assistantController.handleAssistantQuery);

export default router;
