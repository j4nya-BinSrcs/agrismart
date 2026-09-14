import type { Response } from 'express';

/**
 * Standardized API response format helper
 */
export class ApiResponse<T = unknown, M = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: M;

  constructor(statusCode: number, message: string, data: T | null = null, meta: M | null = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
    if (meta !== null) {
      this.meta = meta;
    }
  }

  static success<T = unknown, M = unknown>(
    res: Response,
    statusCode = 200,
    message = 'Success',
    data: T | null = null,
    meta: M | null = null
  ): Response {
    const response = new ApiResponse(statusCode, message, data, meta);
    return res.status(statusCode).json(response);
  }

  static created<T = unknown>(
    res: Response,
    message = 'Resource created successfully',
    data: T | null = null
  ): Response {
    return ApiResponse.success(res, 201, message, data);
  }
}

export default ApiResponse;