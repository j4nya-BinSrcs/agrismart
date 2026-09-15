import { Router } from 'express';
import assistantController from '../controllers/assistantController.js';
import { authenticateOptional } from '../middleware/auth.js';

const router = Router();

/**
 * @route   POST /api/v1/assistant
 * @desc    Generate farmer advisory response grounded in telemetry with Gemini LLM
 * @access  Public (optionally authenticated — richer full-farm context when a token is sent)
 */
router.post('/', authenticateOptional, assistantController.handleAssistantQuery);

export default router;