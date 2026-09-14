/**
 * Structured logger utility for AgriSmart backend
 */
const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (...args: unknown[]) => {
    console.log(`[${getTimestamp()}] [INFO]`, ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(`[${getTimestamp()}] [WARN]`, ...args);
  },
  error: (...args: unknown[]) => {
    console.error(`[${getTimestamp()}] [ERROR]`, ...args);
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${getTimestamp()}] [DEBUG]`, ...args);
    }
  },
};

export default logger;
