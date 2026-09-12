import config from '../config/env.js';
import logger from '../utils/logger.js';

export const mlClient = {
  /**
   * Dispatches image to Python ML microservice if available.
   * Never fabricates results or claims fake predictions when service is offline.
   */
  async predict(imageUrl, metadata = {}) {
    if (!config.mlServiceUrl) {
      return { isAvailable: false, error: 'ML service URL not configured' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

      const response = await fetch(`${config.mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageUrl,
          crop: metadata.crop,
          variety: metadata.variety,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`ML service returned HTTP ${response.status}`);
        return { isAvailable: false, error: `ML service HTTP error: ${response.status}` };
      }

      const data = await response.json();
      return {
        isAvailable: true,
        prediction: data,
      };
    } catch (err) {
      logger.debug(`ML service offline or unreachable (${err.message}). Falling back to baseline diagnostic guidance.`);
      return {
        isAvailable: false,
        error: err.message || 'ML service unreachable',
      };
    }
  },
};

export default mlClient;
