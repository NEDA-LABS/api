/**
 * Ramp Routes Index
 * 
 * Consolidates all on-ramp and off-ramp provider routes
 * Providers: Paycrest, IDRX, Yellow Card, cNGN, Pretium, Snaville
 */

import { Router } from 'express';
import paycrestRoutes from './paycrest.routes.js';
import idrxRoutes from './idrx.js';
import cngnRoutes from './cngn.js';
import pretiumRoutes from './pretium.routes.js';
import snavilleRoutes from './snaville.routes.js';

const router = Router();

// Mount provider routes
router.use('/paycrest', paycrestRoutes);  // Off-ramp via Paycrest
router.use('/idrx', idrxRoutes);          // IDRX on/off-ramp (Indonesia)
router.use('/cngn', cngnRoutes);          // cNGN (Nigeria)
router.use('/pretium', pretiumRoutes);    // Pretium (Malawi, Congo, Ethiopia, etc.)
router.use('/snaville', snavilleRoutes);  // Snaville (Tanzania)

export default router;
