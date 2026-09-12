import authService from '../services/authService.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Handle new user registration
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};
    const result = await authService.registerUser({ name, email, password, role });
    return ApiResponse.created(res, 'User registered successfully', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle user login and JWT generation
 * POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
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
export const getMe = async (req, res, next) => {
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
