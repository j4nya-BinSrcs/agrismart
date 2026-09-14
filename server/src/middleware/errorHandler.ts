import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let error: ApiError;

  // If error is not an instance of ApiError, wrap it
  if (!(err instanceof ApiError)) {
    const errRecord = asRecord(err);
    const rawStatus = errRecord.statusCode;
    const name = errRecord.name;
    const rawMessage = errRecord.message;
    const statusCode = Number(rawStatus) || (name === 'ValidationError' ? 400 : 500);
    const message = typeof rawMessage === 'string' && rawMessage ? rawMessage : 'Internal Server Error';
    const errors = Array.isArray(errRecord.errors) ? errRecord.errors : [];
    const stack = err instanceof Error ? err.stack : '';
    error = new ApiError(statusCode, message, errors, stack);
  } else {
    error = err;
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