/**
 * Standardized operational error class for AgriSmart API
 */
export class ApiError extends Error {
  statusCode: number;
  message: string;
  errors: unknown[];
  isOperational: boolean;

  constructor(statusCode: number, message: string, errors: unknown[] = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors: unknown[] = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(503, message);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }
}

export default ApiError;