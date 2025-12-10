/**
 * Routes Index
 * 
 * Centralizes all API route mounting with organized structure:
 * - Core routes (auth, users, transactions)
 * - Feature routes (kyc, ens, payment-links, etc.)
 * - Ramp routes (all on/off-ramp providers in /ramp)
 * - Admin routes
 * - Webhook routes
 */

import { Router } from 'express';

// Core routes
import healthRoutes from './health.js';
import userRoutes from './users.js';
import authRoutes from './auth.js';
import transactionRoutes from './transactions.js';

// Feature routes
import kycRoutes from './kyc.js';
import ensRoutes from './ens.js';
import contactRoutes from './contacts.js';
import paymentLinkRoutes from './payment-links.js';
import settingsRoutes from './settings.js';
import referralRoutes from './referral.js';
import notificationRoutes from './notifications.js';

// Admin routes
import adminRoutes from './admin.js';
import appsRoutes from './apps.js';

// Webhooks
import webhookRoutes from './webhooks.js';

// Documentation
import docsRoutes from './docs.js';

// Ramp routes (consolidated on/off-ramp providers)
import rampRoutes from './ramp/index.js';

const router = Router();

// API Version prefix
const API_VERSION = '/api/v1';

// =============================================================================
// HEALTH CHECK (no auth)
// =============================================================================
router.use('/health', healthRoutes);

// =============================================================================
// DOCUMENTATION
// =============================================================================
router.use('/docs', docsRoutes);

// =============================================================================
// CORE ROUTES
// =============================================================================
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/transactions`, transactionRoutes);

// =============================================================================
// FEATURE ROUTES
// =============================================================================
router.use(`${API_VERSION}/kyc`, kycRoutes);
router.use(`${API_VERSION}/ens`, ensRoutes);
router.use(`${API_VERSION}/contacts`, contactRoutes);
router.use(`${API_VERSION}/payment-links`, paymentLinkRoutes);
router.use(`${API_VERSION}/settings`, settingsRoutes);
router.use(`${API_VERSION}/referral`, referralRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);

// =============================================================================
// RAMP ROUTES (On/Off-ramp providers)
// =============================================================================
// All ramp providers are consolidated under /ramp:
// - /api/v1/ramp/paycrest - Paycrest off-ramp
// - /api/v1/ramp/idrx - IDRX on/off-ramp (Indonesia)
// - /api/v1/ramp/yellowcard - Yellow Card (Africa)
// - /api/v1/ramp/cngn - cNGN (Nigeria)
router.use(`${API_VERSION}/ramp`, rampRoutes);

// =============================================================================
// ADMIN ROUTES
// =============================================================================
router.use(`${API_VERSION}/admin`, adminRoutes);
router.use(`${API_VERSION}/apps`, appsRoutes);

// =============================================================================
// WEBHOOKS (different auth mechanism)
// =============================================================================
router.use(`${API_VERSION}/webhooks`, webhookRoutes);

export default router;
