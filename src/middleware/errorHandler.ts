import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  isAppError,
} from '../errors/index.js';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Convert Zod validation error to ValidationError
 */
function handleZodError(error: ZodError): ValidationError {
  const fields: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!fields[path]) {
      fields[path] = [];
    }
    fields[path].push(err.message);
  });
  
  return new ValidationError('Validation failed', fields);
}

/**
 * Convert Prisma error to appropriate AppError
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[]) || ['field'];
      return new ConflictError(`${target.join(', ')} already exists`);
    }
    case 'P2025': {
      // Record not found
      return new NotFoundError('Record not found');
    }
    case 'P2003': {
      // Foreign key constraint violation
      return new ValidationError('Invalid reference: related record not found');
    }
    case 'P2014': {
      // Required relation violation
      return new ValidationError('Required relation violated');
    }
    default:
      log.error('Unhandled Prisma error', error as Error, { code: error.code });
      return new AppError('Database error', 500, 'DATABASE_ERROR');
  }
}

/**
 * Global error handler middleware
 * 
 * Handles all errors thrown in the application:
 * 1. AppError - Custom application errors
 * 2. ZodError - Validation errors
 * 3. PrismaClientKnownRequestError - Database errors
 * 4. Unknown errors - Unexpected errors
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: AppError;

  // Handle different error types
  if (isAppError(err)) {
    error = err;
  } else if (err instanceof ZodError) {
    error = handleZodError(err);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    error = new ValidationError('Invalid data format');
  } else {
    // Unknown error - log full details
    log.error('Unexpected error', err, {
      path: req.path,
      method: req.method,
      requestId: req.requestId,
    });
    
    error = new AppError(
      config.isDev ? err.message : 'Internal server error',
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  // Log operational errors at appropriate level
  if (error.isOperational) {
    if (error.statusCode >= 500) {
      log.error(error.message, error);
    } else if (error.statusCode >= 400) {
      log.warn(error.message, { code: error.code, statusCode: error.statusCode });
    }
  }

  // Send error response
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(error.details && config.isDev && { details: error.details }),
      ...((error instanceof ValidationError && error.fields) && { fields: error.fields }),
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  };

  res.status(error.statusCode).json(response);
};

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};
