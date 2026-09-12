import geminiService from '../services/geminiService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Controller to handle POST /api/v1/assistant
 */
export const handleAssistantQuery = async (req, res, next) => {
  try {
    const { message, language = 'en', context = {} } = req.body || {};

    // 1. Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw ApiError.badRequest('Message is required and must be a non-empty string.');
    }

    if (message.length > 2000) {
      throw ApiError.badRequest('Message is too long. Maximum allowed length is 2000 characters.');
    }

    // 2. Validate language
    const validLanguages = ['en', 'hi', 'gu'];
    if (language && !validLanguages.includes(language)) {
      throw ApiError.badRequest(`Invalid language '${language}'. Supported languages: ${validLanguages.join(', ')}.`);
    }

    // 3. Validate context (must be an object if provided)
    if (context !== null && typeof context !== 'object') {
      throw ApiError.badRequest('Context must be a valid JSON object if provided.');
    }

    // 4. Invoke grounded Gemini service
    const responseData = await geminiService.generateAssistantResponse({
      message: message.trim(),
      language: language || 'en',
      context: context || {},
    });

    return ApiResponse.success(
      res,
      200,
      'Assistant response generated successfully',
      responseData
    );
  } catch (error) {
    next(error);
  }
};

export default {
  handleAssistantQuery,
};
