import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import morgan from 'morgan';
import config from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

const app: Express = express();

// ==========================================
// 1. Core Global Middleware
// ==========================================

// CORS configuration
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = Array.isArray(config.corsOrigins)
      ? config.corsOrigins
      : [config.corsOrigin];

    const isExplicitlyAllowed =
      allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    const isLocalDev =
      config.isDevelopment &&
      /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin);

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

export default app;