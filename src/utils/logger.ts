import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 14; // Keep 14 days of logs

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// =============================================================================
// CUSTOM LOG LEVELS WITH COLORS
// =============================================================================

const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
    trace: 6,
  },
  colors: {
    fatal: 'magenta bold',
    error: 'red bold',
    warn: 'yellow',
    info: 'green',
    http: 'cyan',
    debug: 'blue',
    trace: 'gray',
  },
};

// Add custom colors to Winston
winston.addColors(customLevels.colors);

// =============================================================================
// CUSTOM FORMATTERS
// =============================================================================

/**
 * Pretty print for development - colorized, readable output
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, requestId, ...meta }) => {
    // Build prefix
    const prefix = typeof requestId === 'string' ? `[${requestId.slice(0, 8)}]` : '';
    
    // Format metadata
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      // Remove internal winston properties
      const cleanMeta = { ...meta };
      delete cleanMeta.splat;
      
      if (Object.keys(cleanMeta).length > 0) {
        metaStr = '\n' + JSON.stringify(cleanMeta, null, 2)
          .split('\n')
          .map(line => '    ' + line)
          .join('\n');
      }
    }
    
    return `${timestamp} ${level} ${prefix} ${message}${metaStr}`;
  })
);

/**
 * Structured JSON for production - machine parseable
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Sanitize sensitive data
    const sanitized = { ...info };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    
    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
          result[key] = value;
        }
      }
      return result;
    };
    
    return sanitizeObject(sanitized) as winston.Logform.TransformableInfo;
  })(),
  winston.format.json()
);

/**
 * Simple format for error log files
 */
const errorFileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? '\n' + JSON.stringify(meta, null, 2) : '';
    const stackStr = stack ? '\n' + stack : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${stackStr}${metaStr}\n`;
  })
);

// =============================================================================
// CREATE LOGGER INSTANCE
// =============================================================================

/**
 * Main Winston Logger
 * 
 * Log Levels (in order of priority):
 * - fatal: 0 - Application crash, unrecoverable errors
 * - error: 1 - Error that needs attention
 * - warn:  2 - Warning, potential issue
 * - info:  3 - Important events (startup, shutdown)
 * - http:  4 - HTTP request/response logs
 * - debug: 5 - Detailed debugging info
 * - trace: 6 - Very detailed tracing
 */
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.log.level,
  defaultMeta: { 
    service: 'nedapay-backend',
    version: process.env.npm_package_version || '1.0.0',
    env: config.env,
  },
  transports: [],
  exitOnError: false,
});

// =============================================================================
// CONFIGURE TRANSPORTS BY ENVIRONMENT
// =============================================================================

if (config.isProd) {
  // PRODUCTION: JSON to console, files for errors and combined
  
  // Console - JSON format for log aggregators (CloudWatch, Datadog, etc.)
  logger.add(new winston.transports.Console({
    format: prodFormat,
    stderrLevels: ['fatal', 'error'],
  }));
  
  // Error log file - errors and fatal only
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    format: errorFileFormat,
    maxsize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    tailable: true,
  }));
  
  // Combined log file - all levels
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    format: prodFormat,
    maxsize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    tailable: true,
  }));
  
  // Audit log - info level for important events
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'audit.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES * 2, // Keep audit logs longer
    tailable: true,
  }));

} else if (config.isTest) {
  // TEST: Silent by default, can enable with LOG_LEVEL=debug
  logger.add(new winston.transports.Console({
    format: devFormat,
    silent: config.log.level !== 'debug',
  }));

} else {
  // DEVELOPMENT: Pretty console output
  logger.add(new winston.transports.Console({
    format: devFormat,
    level: 'trace', // Show all logs in dev
  }));
  
  // Optional: Debug file for development
  if (process.env.LOG_TO_FILE === 'true') {
    logger.add(new winston.transports.File({
      filename: path.join(LOG_DIR, 'dev.log'),
      format: devFormat,
      maxsize: MAX_FILE_SIZE,
      maxFiles: 3,
    }));
  }
}

// =============================================================================
// MORGAN HTTP STREAM
// =============================================================================

/**
 * Stream for Morgan HTTP request logger
 */
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// =============================================================================
// STRUCTURED LOGGING HELPERS
// =============================================================================

/**
 * Structured logging interface
 * Provides semantic methods for different log types
 */
export const log = {
  // -------------------------------------------------------------------------
  // Core Log Methods
  // -------------------------------------------------------------------------
  
  fatal: (message: string, error?: Error, meta?: object) => {
    logger.log('fatal', message, {
      ...(error && { 
        error: error.message, 
        stack: error.stack,
        name: error.name,
      }),
      ...meta,
    });
  },
  
  error: (message: string, error?: Error, meta?: object) => {
    logger.error(message, {
      ...(error && { 
        error: error.message, 
        stack: error.stack,
        name: error.name,
      }),
      ...meta,
    });
  },
  
  warn: (message: string, meta?: object) => {
    logger.warn(message, meta);
  },
  
  info: (message: string, meta?: object) => {
    logger.info(message, meta);
  },
  
  http: (message: string, meta?: object) => {
    logger.http(message, meta);
  },
  
  debug: (message: string, meta?: object) => {
    logger.debug(message, meta);
  },
  
  trace: (message: string, meta?: object) => {
    logger.log('trace', message, meta);
  },

  // -------------------------------------------------------------------------
  // Semantic Log Methods
  // -------------------------------------------------------------------------
  
  /**
   * Log API request start
   */
  request: (method: string, path: string, meta?: {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
  }) => {
    logger.http(`→ ${method} ${path}`, {
      type: 'request',
      ...meta,
    });
  },
  
  /**
   * Log API response
   */
  response: (method: string, path: string, statusCode: number, durationMs: number, meta?: {
    requestId?: string;
    userId?: string;
    contentLength?: number;
  }) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    const icon = statusCode >= 500 ? '✗' : statusCode >= 400 ? '⚠' : '✓';
    
    logger.log(level, `← ${method} ${path} ${statusCode} ${durationMs}ms ${icon}`, {
      type: 'response',
      statusCode,
      durationMs,
      ...meta,
    });
  },
  
  /**
   * Log external service call
   */
  external: (service: string, action: string, meta?: {
    requestId?: string;
    durationMs?: number;
    status?: 'success' | 'error';
    statusCode?: number;
  }) => {
    const icon = meta?.status === 'error' ? '✗' : '↔';
    const level = meta?.status === 'error' ? 'error' : 'info';
    
    logger.log(level, `${icon} [${service}] ${action}`, {
      type: 'external',
      service,
      ...meta,
    });
  },
  
  /**
   * Log database operation
   */
  db: (operation: string, entity: string, meta?: {
    durationMs?: number;
    recordCount?: number;
    query?: string;
  }) => {
    logger.debug(`[DB] ${operation} ${entity}`, {
      type: 'database',
      operation,
      entity,
      ...meta,
    });
  },
  
  /**
   * Log authentication event
   */
  auth: (event: 'login' | 'logout' | 'register' | 'token_refresh' | 'failed', meta?: {
    userId?: string;
    privyUserId?: string;
    method?: string;
    reason?: string;
  }) => {
    const level = event === 'failed' ? 'warn' : 'info';
    logger.log(level, `[AUTH] ${event.toUpperCase()}`, {
      type: 'auth',
      event,
      ...meta,
    });
  },
  
  /**
   * Log business event (for audit trail)
   */
  audit: (action: string, meta: {
    userId: string;
    resource: string;
    resourceId?: string;
    details?: object;
  }) => {
    logger.info(`[AUDIT] ${action}`, {
      type: 'audit',
      action,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  },
  
  /**
   * Log performance metric
   */
  perf: (operation: string, durationMs: number, meta?: {
    threshold?: number;
    details?: object;
  }) => {
    const isSlowLog = meta?.threshold && durationMs > meta.threshold;
    const level = isSlowLog ? 'warn' : 'debug';
    
    logger.log(level, `[PERF] ${operation}: ${durationMs}ms${isSlowLog ? ' (SLOW)' : ''}`, {
      type: 'performance',
      operation,
      durationMs,
      slow: isSlowLog,
      ...meta,
    });
  },
  
  /**
   * Log startup/shutdown events
   */
  lifecycle: (event: 'starting' | 'started' | 'stopping' | 'stopped' | 'ready', meta?: object) => {
    const icons: Record<string, string> = {
      starting: '🚀',
      started: '✅',
      stopping: '🛑',
      stopped: '⏹️',
      ready: '🟢',
    };
    
    logger.info(`${icons[event] || '📋'} Server ${event}`, {
      type: 'lifecycle',
      event,
      ...meta,
    });
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: object) {
  return logger.child(context);
}

/**
 * Measure and log execution time
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  threshold = 1000
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    log.perf(operation, Date.now() - start, { threshold });
    return result;
  } catch (error) {
    log.perf(operation, Date.now() - start, { threshold, details: { error: true } });
    throw error;
  }
}

/**
 * Wrap a function with error logging
 */
export function withErrorLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context: string
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          log.error(`Error in ${context}`, error);
          throw error;
        });
      }
      return result;
    } catch (error) {
      log.error(`Error in ${context}`, error as Error);
      throw error;
    }
  }) as T;
}

export default logger;
