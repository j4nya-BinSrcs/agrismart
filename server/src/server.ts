import type { Server } from 'http';
import app from './app.js';
import config from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import logger from './utils/logger.js';

let server: Server;

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
const gracefulShutdown = async (signal: string) => {
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