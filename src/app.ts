import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import { config } from './config/index.js';
import { httpLogStream } from './utils/logger.js';
import {
  errorHandler,
  notFoundHandler,
  requestContext,
} from './middleware/index.js';

// Import route modules
import routes from './routes/index.js';

/**
 * Create and configure Express application
 * 
 * Middleware order is important:
 * 1. Security (helmet, cors)
 * 2. Parsing (json, urlencoded)
 * 3. Logging (morgan)
 * 4. Context (requestId, timing)
 * 5. Rate limiting
 * 6. Routes
 * 7. Error handling (404, global error handler)
 */
export function createApp(): Application {
  const app = express();

  // ==========================================================================
  // Security Middleware
  // ==========================================================================
  
  // Helmet - Set security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: config.isProd,
    crossOriginEmbedderPolicy: config.isProd,
  }));

  // CORS - Cross-Origin Resource Sharing
  app.use(cors({
    origin: true, // Allow all origins (development and production)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'x-api-key'],
    exposedHeaders: ['X-Request-ID'],
  }));

  // ==========================================================================
  // Parsing Middleware
  // ==========================================================================
  
  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));
  
  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================================================
  // Compression
  // ==========================================================================
  
  app.use(compression());

  // ==========================================================================
  // Logging Middleware
  // ==========================================================================
  
  // HTTP request logging
  app.use(morgan(
    config.log.format,
    { stream: httpLogStream, skip: () => config.isTest }
  ));

  // ==========================================================================
  // Request Context
  // ==========================================================================
  
  // Add request ID and timing
  app.use(requestContext);

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================
  
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests, please try again later',
        statusCode: 429,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isDev, // Skip rate limiting in development
  });
  
  app.use(limiter);

  // ==========================================================================
  // API Routes
  // ==========================================================================
  
  // Mount all routes (health, auth, users, transactions, idrx, kyc, etc.)
  app.use(routes);

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  
  // 404 handler - must be after all routes
  app.use(notFoundHandler);
  
  // Global error handler - must be last
  app.use(errorHandler);

  return app;
}

export default createApp;
