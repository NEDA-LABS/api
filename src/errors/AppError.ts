/**
 * Application Error Classes
 * 
 * Follows: Single Responsibility Principle
 * Each error class represents a specific type of error
 * 
 * Error Hierarchy:
 * - AppError (base)
 *   ├── ValidationError (400)
 *   ├── AuthenticationError (401)
 *   ├── AuthorizationError (403)
 *   ├── NotFoundError (404)
 *   ├── ConflictError (409)
 *   ├── RateLimitError (429)
 *   ├── ExternalServiceError (502)
 *   └── InternalError (500)
 */

export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * Base application error class
 * All custom errors extend from this
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: ErrorDetails
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 Bad Request - Invalid input/validation errors
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    fields?: Record<string, string[]>,
    details?: ErrorDetails
  ) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
    this.fields = fields;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      ...(this.fields && { fields: this.fields }),
    };
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    details?: ErrorDetails
  ) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, details);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    details?: ErrorDetails
  ) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, details);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
  public readonly resource?: string;

  constructor(
    message: string = 'Resource not found',
    resource?: string,
    details?: ErrorDetails
  ) {
    super(message, 404, 'NOT_FOUND', true, details);
    this.resource = resource;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      ...(this.resource && { resource: this.resource }),
    };
  }
}

/**
 * 409 Conflict - Resource already exists or conflict
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource already exists',
    details?: ErrorDetails
  ) {
    super(message, 409, 'CONFLICT_ERROR', true, details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Too many requests',
    retryAfter?: number,
    details?: ErrorDetails
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, details);
    this.retryAfter = retryAfter;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      ...(this.retryAfter && { retryAfter: this.retryAfter }),
    };
  }
}

/**
 * 502 Bad Gateway - External service error
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(
    service: string,
    message: string = 'External service error',
    details?: ErrorDetails
  ) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
    this.service = service;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
    };
  }
}

/**
 * 500 Internal Server Error - Unexpected errors
 */
export class InternalError extends AppError {
  constructor(
    message: string = 'Internal server error',
    details?: ErrorDetails
  ) {
    super(message, 500, 'INTERNAL_ERROR', false, details);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
