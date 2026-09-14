import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError.js';

type ValidationResult = string[] | null;
type ValidationFn = (req: Request) => ValidationResult;

/**
 * Higher-order request validation middleware.
 * Accepts a validation function `(req) => string[] | null` or rules and passes errors to centralized error handler.
 */
export const validate = (validateFn: ValidationFn) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validationErrors = validateFn(req);
      if (validationErrors && validationErrors.length > 0) {
        return next(ApiError.badRequest('Validation failed', validationErrors));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * Validates that required fields exist in req.body
 */
export const requireBodyFields = (fields: string[] = []) => {
  return validate((req) => {
    const missing = fields.filter(
      (f) =>
        req.body[f] === undefined ||
        req.body[f] === null ||
        (typeof req.body[f] === 'string' && req.body[f].trim() === '')
    );
    if (missing.length > 0) {
      return missing.map((f) => `Missing required field: ${f}`);
    }
    return null;
  });
};

export default {
  validate,
  requireBodyFields,
};