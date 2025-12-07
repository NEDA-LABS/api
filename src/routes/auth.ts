import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route POST /api/v1/auth/sync
 * @desc  Sync user from Privy authentication
 * @access Private
 */
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    // TODO: Implement user sync from Privy
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc  Get current authenticated user
 * @access Private
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // TODO: Return current user
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/auth/verify-token
 * @desc  Verify Privy token
 * @access Public
 */
router.post('/verify-token', async (req, res, next) => {
  try {
    // TODO: Verify token
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

export default router;
