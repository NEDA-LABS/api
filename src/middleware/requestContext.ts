import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger.js';

/**
 * Add request context middleware
 * Adds requestId and startTime to every request for tracing and metrics
 */
export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Log request start
  log.request(req.method, req.path, {
    requestId: req.requestId,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    log.response(req.method, req.path, res.statusCode, duration);
  });
  
  next();
};

/**
 * Raw body parser for webhook signature verification
 * Captures raw body before JSON parsing
 */
export const rawBodyParser = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.headers['content-type'] === 'application/json') {
    let data = '';
    
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    
    req.on('end', () => {
      req.rawBody = Buffer.from(data);
      next();
    });
  } else {
    next();
  }
};
