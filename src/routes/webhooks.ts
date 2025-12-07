import { Router } from 'express';
import { rawBodyParser } from '../middleware/requestContext.js';

const router = Router();

// All webhook routes use raw body for signature verification
router.use(rawBodyParser);

/**
 * @route POST /api/v1/webhooks/idrx
 * @desc  IDRX webhook endpoint
 * @access Public (signature verified)
 */
router.post('/idrx', async (req, res, next) => {
  try {
    // TODO: Implement IDRX webhook handler
    // Verify signature from headers
    // Process mint/redeem events
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/webhooks/smile-id
 * @desc  Smile ID webhook endpoint
 * @access Public (signature verified)
 */
router.post('/smile-id', async (req, res, next) => {
  try {
    // TODO: Implement Smile ID webhook handler
    // Verify signature
    // Process KYC verification results
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/webhooks/sumsub
 * @desc  Sumsub webhook endpoint
 * @access Public (signature verified)
 */
router.post('/sumsub', async (req, res, next) => {
  try {
    // TODO: Implement Sumsub webhook handler
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/webhooks/yellowcard
 * @desc  Yellow Card webhook endpoint
 * @access Public (signature verified)
 */
router.post('/yellowcard', async (req, res, next) => {
  try {
    // TODO: Implement Yellow Card webhook handler
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/webhooks/cngn
 * @desc  cNGN/Korapay webhook endpoint
 * @access Public (signature verified)
 */
router.post('/cngn', async (req, res, next) => {
  try {
    // TODO: Implement cNGN webhook handler
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/webhooks/paycrest
 * @desc  Paycrest webhook endpoint
 * @access Public (signature verified)
 */
router.post('/paycrest', async (req, res, next) => {
  try {
    // TODO: Implement Paycrest webhook handler
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

export default router;
