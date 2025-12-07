import { User } from '@prisma/client';

/**
 * Extend Express Request interface
 * Adds custom properties for authentication and request context
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user from JWT/Privy
       */
      user?: {
        id: string;
        privyUserId: string;
        email?: string | null;
        wallet?: string | null;
      };
      
      /**
       * Request ID for tracing
       */
      requestId: string;
      
      /**
       * Request start time for duration calculation
       */
      startTime: number;
      
      /**
       * Raw body for webhook signature verification
       */
      rawBody?: Buffer;
    }
  }
}

export {};
