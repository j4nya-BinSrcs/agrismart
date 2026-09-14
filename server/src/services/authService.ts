import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import type { UserDocument, UserRole } from '../models/User.js';
import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw ApiError.serviceUnavailable(
      'Database is unavailable. Start MongoDB and restart the server, then try again.'
    );
  }
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;
const BCRYPT_SALT_ROUNDS = 10;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: string;
  confirmPassword?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  token: string;
}

export interface SafeUserResult {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validates and generates a signed JWT token
 */
export const generateToken = (user: Pick<UserDocument, '_id' | 'role'>) => {
  const userId = user._id ? user._id.toString() : '';
  const payload = {
    userId,
    role: user.role || 'farmer',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const authService = {
  /**
   * Registers a new user with bcrypt password hashing
   */
  async registerUser({ name, email, password, role = 'farmer', confirmPassword }: RegisterInput): Promise<AuthResult> {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Name is required and cannot be empty.');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw ApiError.badRequest('Email is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw ApiError.badRequest('Please provide a valid email address.');
    }

    if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw ApiError.badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw ApiError.badRequest('Passwords do not match.');
    }

    const allowedRoles = ['owner', 'farmer', 'manager', 'agronomist', 'admin'];
    const assignedRole = allowedRoles.includes(role) ? (role as UserRole) : 'farmer';

    assertDatabaseReady();

    // Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw ApiError.badRequest('An account with this email address already exists.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Persist user to MongoDB
    let newUser: UserDocument;
    try {
      newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
      });
    } catch (err) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: number }).code : undefined;
      if (code === 11000) {
        throw ApiError.badRequest('An account with this email address already exists.');
      }
      throw err;
    }

    const token = generateToken(newUser);

    logger.info(`User registered successfully: ${newUser.email} (ID: ${newUser._id})`);

    return {
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    };
  },

  /**
   * Authenticates user credentials and returns safe user + JWT
   */
  async loginUser({ email, password }: LoginInput): Promise<AuthResult> {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw ApiError.badRequest('Email is required.');
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      throw ApiError.badRequest('Password is required.');
    }

    assertDatabaseReady();

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const token = generateToken(user);

    logger.info(`User authenticated: ${user.email} (ID: ${user._id})`);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },

  /**
   * Fetches user profile safely by ID
   */
  async getUserById(id: string): Promise<SafeUserResult> {
    if (!id) {
      throw ApiError.badRequest('User ID is required.');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
};

export default authService;