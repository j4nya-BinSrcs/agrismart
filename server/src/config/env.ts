import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root first, then override with backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
      ],
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrismart',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  weather: {
    defaultLatitude: parseFloat(process.env.DEFAULT_LATITUDE || '22.5645'),
    defaultLongitude: parseFloat(process.env.DEFAULT_LONGITUDE || '72.9289'),
  },
  chloromap: {
    url: process.env.CHLOROMAP_URL || 'http://127.0.0.1:8000',
    timeoutMs: parseInt(process.env.CHLOROMAP_TIMEOUT_MS || '20000', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '15000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'agrismart_jwt_development_secret_key_sih_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
});

export default config;
