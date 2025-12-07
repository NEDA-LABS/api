import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { idrxService } from '../../services/ramp/idrx/service.js';
import { idrxSyncService } from '../../services/ramp/idrx/sync.service.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

// ============================================================================
// ONBOARDING
// ============================================================================

/**
 * @route GET /api/v1/idrx/status
 * @desc  Get IDRX onboarding status for current user
 * @access Private
 */
router.get('/status', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement get IDRX status
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/idrx/onboarding
 * @desc  Complete IDRX onboarding
 * @access Private
 */
router.post('/onboarding', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement IDRX onboarding
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/idrx/onboarding/status
 * @desc  Get onboarding status (admin endpoint)
 * @access Admin
 */
router.get('/onboarding/status', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    // TODO: Implement get all onboarding statuses
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

/**
 * @route GET /api/v1/idrx/bank-accounts
 * @desc  List user's bank accounts
 * @access Private
 */
router.get('/bank-accounts', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement list bank accounts
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/idrx/bank-accounts
 * @desc  Add a new bank account
 * @access Private
 */
router.post('/bank-accounts', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement add bank account
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/idrx/bank-accounts/:id
 * @desc  Delete a bank account
 * @access Private
 */
router.delete('/bank-accounts/:id', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement delete bank account
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * @route GET /api/v1/idrx/rates
 * @desc  Get current IDRX exchange rates
 * @access Public
 */
router.get('/rates', async (_req, res, next) => {
  try {
    // TODO: Implement get rates
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/idrx/mint
 * @desc  Create mint request (fiat -> IDRX)
 * @access Private
 */
router.post('/mint', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement mint
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/idrx/redeem
 * @desc  Create redeem request (IDRX -> fiat)
 * @access Private
 */
router.post('/redeem', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement redeem
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/idrx/redeem-idrx
 * @desc  Redeem IDRX token specifically
 * @access Private
 */
router.post('/redeem-idrx', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement IDRX token redeem
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/idrx/transactions
 * @desc  Get user's IDRX transactions
 * @access Private
 */
router.get('/transactions', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement get transactions
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/idrx/methods
 * @desc  Get available payment methods
 * @access Private
 */
router.get('/methods', authenticate, async (_req, res, next) => {
  try {
    const methods = await idrxService.getMethods();
    res.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/idrx/kyc-data
 * @desc  Get user's KYC data from IDRX
 * @access Private
 */
router.get('/kyc-data', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement get KYC data
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ADMIN
// ============================================================================

const syncSchema = z.object({
  dryRun: z.boolean().optional(),
  batchSize: z.number().int().min(1).max(100).optional(),
});

/**
 * @route POST /api/v1/idrx/sync
 * @desc  Sync IDRX members (admin only)
 * @access Admin
 */
router.post('/sync', authenticate, requireAdmin, validate(syncSchema), async (req, res, next) => {
  try {
    const { dryRun, batchSize } = req.body;
    const result = await idrxSyncService.syncMembers({
      dryRun,
      batchSize,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/idrx/manual-credentials
 * @desc  Set manual credentials (admin only)
 * @access Admin
 */
router.post('/manual-credentials', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    // TODO: Implement manual credentials
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

export default router;
