import { Router } from 'express';
import { prisma } from '../repositories/prisma.js';
import { apiKeyService } from '../services/apikey.service.js';
import { requireAdminOrMasterKey } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Protect all app management routes
router.use(requireAdminOrMasterKey);

// Schema for creating an app
const createAppSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

// GET /api/v1/apps - List all apps
router.get('/', async (_req, res) => {
  try {
    const apps = await prisma.app.findMany({
      include: {
        _count: {
          select: { apiKeys: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: apps });
  } catch (error) {
    console.error('Failed to fetch apps:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch apps' });
  }
});

// POST /api/v1/apps - Create a new app
router.post('/', async (req, res) => {
  try {
    const validated = createAppSchema.parse(req.body);
    
    // Check if name exists
    const existing = await prisma.app.findUnique({
      where: { name: validated.name },
    });
    
    if (existing) {
      res.status(409).json({ success: false, error: 'App with this name already exists' });
      return;
    }

    const app = await prisma.app.create({
      data: {
        name: validated.name,
        description: validated.description,
        webhookUrl: validated.webhookUrl,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: app });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    console.error('Failed to create app:', error);
    res.status(500).json({ success: false, error: 'Failed to create app' });
  }
});

// POST /api/v1/apps/:id/keys - Generate API Key for app
router.post('/:id/keys', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, environment } = req.body;

    const app = await prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    // Generate key data using service
    const keyResult = apiKeyService.createKey({
      appId: app.id,
      name: name || `Key for ${app.name}`,
      environment: environment || 'live',
      permissions: ['*'], // Full access for app keys
    });

    // Store in DB
    const apiKey = await prisma.apiKey.create({
      data: {
        id: keyResult.id,
        appId: app.id,
        keyId: keyResult.keyId,
        hashedKey: apiKeyService.getHashedKey(keyResult.key),
        name: keyResult.name,
        environment: keyResult.environment,
        isActive: true,
      },
    });

    res.status(201).json({ 
      success: true, 
      data: {
        id: apiKey.id,
        key: keyResult.key, // Only returned once!
        keyId: apiKey.keyId,
        environment: apiKey.environment,
        createdAt: apiKey.createdAt,
      }
    });
  } catch (error) {
    console.error('Error creating key:', error);
    res.status(500).json({ success: false, error: 'Failed to generate API key' });
  }
});

export default router;
