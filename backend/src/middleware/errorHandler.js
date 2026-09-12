import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // If error is not an instance of ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  const { statusCode, message, errors } = error;

  const response = {
    success: false,
    statusCode,
    message,
    ...(errors && errors.length > 0 && { errors }),
    ...(config.isDevelopment && { stack: error.stack }),
  };

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${message}\nStack: ${error.stack}`);
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${message}`);
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
