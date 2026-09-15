import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Authentication middleware that verifies JWT from Authorization header
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token is required.'));
    }

    const token = authHeader.split(' ')[1];
    if (!token || !token.trim()) {
      return next(ApiError.unauthorized('Authentication token is malformed.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload & { userId?: string };
    } catch (jwtErr) {
      if ((jwtErr as { name?: string })?.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Authentication token has expired. Please log in again.'));
      }
      return next(ApiError.unauthorized('Invalid authentication token.'));
    }

    if (!decoded || !decoded.userId) {
      return next(ApiError.unauthorized('Invalid token payload.'));
    }

    // Lookup user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists.'));
    }

    // Attach safe user object to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (err) {
    logger.error(`Authentication middleware error: ${getErrorMessage(err)}`);
    return next(ApiError.unauthorized('Authentication failed.'));
  }
};

export default authenticate;

/**
 * Optional authentication: attaches req.user when a valid Bearer token is
 * present, and continues anonymously otherwise. Used by the assistant route so
 * authenticated farmers get full backend context enrichment while demo /
 * guest users still receive grounded answers from client-provided context.
 */
export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token || !token.trim()) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload & {
      userId?: string;
    };
    if (!decoded || !decoded.userId) {
      return next();
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next();
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
    return next();
  } catch {
    return next();
  }
};