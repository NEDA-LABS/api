import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apikey.service.js';
import { prisma } from '../repositories/prisma.js';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
    let key = '';

    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        key = authHeader.substring(7);
      } else {
        key = authHeader;
      }
    }

    if (!key) {
      return res.status(401).json({ message: 'Missing API key' });
    }

    // Validate using the robust service
    const validated = await apiKeyService.validateKeyAsync(
      key,
      async (keyId) => {
        const apiKey = await prisma.apiKey.findUnique({
            where: { keyId },
            include: { user: true, app: true }
        });
        if (!apiKey) return null;
        
        return {
            id: apiKey.id,
            userId: apiKey.userId || undefined,
            appId: apiKey.appId || undefined,
            keyId: apiKey.keyId,
            hashedKey: apiKey.hashedKey,
            name: apiKey.name,
            environment: apiKey.environment as 'live' | 'test',
            permissions: [],
            expiresAt: null,
            lastUsed: apiKey.lastUsed,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt
        };
      },
      async (id) => {
          // Fire and forget update
          prisma.apiKey.update({ 
              where: { id }, 
              data: { lastUsed: new Date() }
          }).catch(err => console.error('Failed to update API key usage', err));
      }
    );

    if (!validated) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    // Attach App context
    if (validated.appId) {
       const app = await prisma.app.findUnique({ where: { id: validated.appId }});
       if (app) (req as any).appClient = app;
    } 
    
    // Attach User context
    if (validated.userId) {
       const user = await prisma.user.findUnique({ where: { id: validated.userId }});
       if (user) (req as any).user = user;
    }

    (req as any).apiKey = validated;

    next();
  } catch (error) {
    console.error('API Key validation error:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};
