import authService from '../services/authService.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AsyncHandler } from '../types/handlers.js';

/**
 * Handle new user registration
 * POST /api/v1/auth/register
 */
export const register: AsyncHandler = async (req, res, next) => {
  try {
    const { name, email, password, role, confirmPassword } = req.body || {};
    const result = await authService.registerUser({ name, email, password, role, confirmPassword });
    return ApiResponse.created(res, 'User registered successfully', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle user login and JWT generation
 * POST /api/v1/auth/login
 */
export const login: AsyncHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await authService.loginUser({ email, password });
    return ApiResponse.success(res, 200, 'Login successful', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle retrieving authenticated user profile
 * GET /api/v1/auth/me
 */
export const getMe: AsyncHandler = async (req, res, next) => {
  try {
    return ApiResponse.success(res, 200, 'Current user profile retrieved', {
      user: req.user,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  register,
  login,
  getMe,
};
