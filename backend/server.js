import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { notFoundHandler } from './src/middleware/notFoundHandler.js';
import logger from './src/utils/logger.js';

const app = express();

// ==========================================
// 1. Core Global Middleware
// ==========================================

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = Array.isArray(config.corsOrigins)
      ? config.corsOrigins
      : [config.corsOrigin];

    const isExplicitlyAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    const isLocalDev = config.isDevelopment && /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin);

    if (isExplicitlyAllowed || isLocalDev) {
      return callback(null, true);
    }

    return callback(new Error(`Origin '${origin}' not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==========================================
// 2. API Routes
// ==========================================

// Root welcome route
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to AgriSmart AI Backend API',
    version: 'v1',
    docs: '/api/v1/health',
  });
});

// Mount /api/v1 routes
app.use('/api/v1', routes);

// ==========================================
// 3. Error Handling
// ==========================================

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

// ==========================================
// 4. Server Initialization & Graceful Shutdown
// ==========================================

let server;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Listener
  server = app.listen(config.port, () => {
    logger.info(`===============================================`);
    logger.info(`  AgriSmart Backend Server running`);
    logger.info(`  Environment : ${config.env}`);
    logger.info(`  Port        : ${config.port}`);
    logger.info(`  Health Check: http://localhost:${config.port}/api/v1/health`);
    logger.info(`===============================================`);
  });
};

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Process terminated cleanly.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Launch server
startServer();

export default app;
