/**
 * Standardized API response format helper
 */
export class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
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

  static success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const response = new ApiResponse(statusCode, message, data, meta);
    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Resource created successfully', data = null) {
    return ApiResponse.success(res, 201, message, data);
  }
}

export default ApiResponse;
