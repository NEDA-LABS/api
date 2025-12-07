import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';

/**
 * Request validation source
 */
type ValidationSource = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * 
 * @param schema - Zod schema for validation
 * @param source - Where to get data from (body, query, params)
 * @returns Express middleware that validates request data
 * 
 * @example
 * ```typescript
 * const createUserSchema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(2),
 * });
 * 
 * router.post('/users', validate(createUserSchema), createUser);
 * ```
 */
export function validate<T>(
  schema: ZodSchema<T>,
  source: ValidationSource = 'body'
) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      
      // Replace the source data with validated (and potentially transformed) data
      req[source] = validated as typeof req[typeof source];
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!fields[path]) {
            fields[path] = [];
          }
          fields[path].push(err.message);
        });
        
        next(new ValidationError('Validation failed', fields));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return validate(schema, 'body');
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return validate(schema, 'query');
}

/**
 * Validate route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return validate(schema, 'params');
}

/**
 * Combine multiple validations
 */
export function validateRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
>(schemas: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const middlewares: Array<
      (req: Request, res: Response, next: NextFunction) => Promise<void>
    > = [];

    if (schemas.body) {
      middlewares.push(validate(schemas.body, 'body'));
    }
    if (schemas.query) {
      middlewares.push(validate(schemas.query, 'query'));
    }
    if (schemas.params) {
      middlewares.push(validate(schemas.params, 'params'));
    }

    // Execute all validation middlewares in sequence
    for (const middleware of middlewares) {
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    next();
  };
}
