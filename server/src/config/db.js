import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

let isConnected = false;
let listenersAttached = false;

const attachListeners = () => {
  if (listenersAttached) return;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info(`MongoDB connected successfully to ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  listenersAttached = true;
};

export const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  attachListeners();

  try {
    logger.info(`Attempting MongoDB connection to: ${config.mongodb.uri}`);
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    isConnected = true;
  } catch (error) {
    isConnected = false;
    logger.warn(`MongoDB connection unavailable (${error.message}). Running in standalone mode.`);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully.');
  }
};

export const getDatabaseStatus = () => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateCode = mongoose.connection.readyState;
  return {
    status: readyStates[stateCode] || 'unknown',
    connected: stateCode === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

export default {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
};
