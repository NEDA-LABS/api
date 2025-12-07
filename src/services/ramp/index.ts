/**
 * Ramp Services Index
 * 
 * Centralizes all ramp provider service exports
 */

// Paycrest (Off-ramp)
export { paycrestService } from './paycrest.service.js';
export type {
  PaycrestRecipient,
  PaycrestOrderPayload,
  PaycrestOrder,
  PaycrestOrderStatus,
  PaycrestOrderResponse,
  PaycrestOrdersResponse,
  PaycrestOrdersSummary,
  PaycrestInstitution,
  PaycrestCurrency,
  PaycrestAccountVerification,
  PaycrestWebhookPayload,
  PaycrestWebhookEvent,
  FetchOrdersParams,
  SupportedToken,
} from './paycrest.service.js';

// IDRX (On/Off-ramp)
export { idrxService } from './idrx/service.js';
export { idrxSyncService } from './idrx/sync.service.js';
export * from './idrx/types.js';

// TODO: Add other provider services as they are implemented
// export { yellowcardService } from './yellowcard.service.js';
// export { cngnService } from './cngn.service.js';
