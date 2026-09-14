import type { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import ApiResponse from '../utils/ApiResponse.js';
import config from '../config/env.js';

const startTime = Date.now();

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

export const getHealth = (_req: Request, res: Response) => {
  const uptimeSeconds = process.uptime();
  const dbStatus = getDatabaseStatus();

  const healthData = {
    status: dbStatus.connected ? 'healthy' : 'degraded',
    service: 'AgriSmart Backend API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptimeSeconds),
      formatted: formatUptime(uptimeSeconds),
      startedAt: new Date(startTime).toISOString(),
    },
    database: {
      status: dbStatus.status,
      connected: dbStatus.connected,
      host: dbStatus.host,
      name: dbStatus.name,
    },
    system: {
      nodeVersion: process.version,
      memoryUsage: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    },
  };

  return ApiResponse.success(res, 200, 'AgriSmart API health check passed', healthData);
};

export default {
  getHealth,
};
