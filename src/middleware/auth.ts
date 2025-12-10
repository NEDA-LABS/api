import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../errors/index.js';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';

/**
 * JWT payload structure from Privy
 */
interface PrivyTokenPayload extends JwtPayload {
  sub: string; // privyUserId
  iss: string;
  aud: string;
  sid?: string;
  email?: string;
  wallet?: string;
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Verify JWT token
 * Supports both custom JWT and Privy JWT
 */
async function verifyToken(token: string): Promise<PrivyTokenPayload> {
  try {
    // First try to verify with our JWT secret
    const decoded = jwt.verify(token, config.jwt.secret) as PrivyTokenPayload;
    return decoded;
  } catch (error) {
    // If custom JWT fails, try Privy JWT verification
    // In production, you'd fetch JWKS from Privy and verify
    // For now, we'll decode without verification for Privy tokens
    // and rely on the Privy JWKS endpoint
    
    if (config.privy.jwksEndpoint) {
      // TODO: Implement JWKS verification for production
      // This would use jwks-rsa or similar library
      const decoded = jwt.decode(token) as PrivyTokenPayload | null;
      
      if (!decoded || !decoded.sub) {
        throw new AuthenticationError('Invalid token');
      }
      
      // Basic validation
      if (decoded.aud !== config.privy.appId) {
        log.warn('Token audience mismatch', { 
          expected: config.privy.appId, 
          got: decoded.aud 
        });
      }
      
      return decoded;
    }
    
    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }
    
    const payload = await verifyToken(token);
    
    // Attach user info to request
    req.user = {
      id: '', // Will be populated by user lookup
      privyUserId: payload.sub,
      email: payload.email || null,
      wallet: payload.wallet || null,
    };
    
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      log.error('Authentication error', error as Error);
      next(new AuthenticationError('Authentication failed'));
    }
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (token) {
      const payload = await verifyToken(token);
      req.user = {
        id: '',
        privyUserId: payload.sub,
        email: payload.email || null,
        wallet: payload.wallet || null,
      };
    }
    
    next();
  } catch {
    // Token invalid, but that's okay for optional auth
    next();
  }
};

/**
 * Admin authorization middleware
 * Requires authentication + admin wallet
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new AuthenticationError('Authentication required'));
    return;
  }
  
  const userWallet = req.user.wallet?.toLowerCase();
  const isAdmin = config.admin.wallets.some(
    (adminWallet) => adminWallet.toLowerCase() === userWallet
  );
  
  if (!isAdmin) {
    log.warn('Admin access denied', { 
      wallet: userWallet,
      privyUserId: req.user.privyUserId 
    });
    next(new AuthorizationError('Admin access required'));
    return;
  }
  
  next();
};

/**
 * Rate limit by user middleware
 * Tracks requests per authenticated user
 */
export const requireUser = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new AuthenticationError('Authentication required'));
    return;
  }
  next();
};

/**
 * Require Admin Access via JWT (Wallet) OR Master Key
 */
export const requireAdminOrMasterKey = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Check for Master Key
  const masterKey = config.admin.masterKey;
  const providedKey = req.headers['x-admin-key'];

  if (masterKey && typeof providedKey === 'string' && providedKey === masterKey) {
    // Authorized via Master Key
    return next();
  }

  // 2. Fallback to JWT Auth
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      throw new AuthenticationError('Authentication required');
    }
    
    const payload = await verifyToken(token);
    
    // Attach user
    req.user = {
      id: '',
      privyUserId: payload.sub,
      email: payload.email || null,
      wallet: payload.wallet || null,
    };
    
    // Check Admin Wallet
    const userWallet = req.user.wallet?.toLowerCase();
    const isAdmin = config.admin.wallets.some(
      (adminWallet) => adminWallet.toLowerCase() === userWallet
    );
    
    if (!isAdmin) {
      throw new AuthorizationError('Admin access required');
    }
    
    next();
  } catch (error) {
    // Pass original error if it was auth related, or wrap it
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      next(error);
    } else {
      next(new AuthenticationError('Authentication failed'));
    }
  }
};
