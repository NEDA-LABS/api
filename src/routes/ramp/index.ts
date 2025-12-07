/**
 * Ramp Routes Index
 * 
 * Consolidates all on-ramp and off-ramp provider routes
 * Providers: Paycrest, IDRX, Yellow Card, cNGN
 */

import { Router } from 'express';
import paycrestRoutes from './paycrest.routes.js';
import idrxRoutes from './idrx.js';
import yellowcardRoutes from './yellowcard.js';
import cngnRoutes from './cngn.js';

const router = Router();

// Mount provider routes
router.use('/paycrest', paycrestRoutes);  // Off-ramp via Paycrest
router.use('/idrx', idrxRoutes);          // IDRX on/off-ramp (Indonesia)
router.use('/yellowcard', yellowcardRoutes); // Yellow Card (Africa)
router.use('/cngn', cngnRoutes);          // cNGN (Nigeria)

export default router;
