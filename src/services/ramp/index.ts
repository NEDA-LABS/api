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

// Paycrest Transaction Service (Transaction retrieval)
export { paycrestTransactionService } from './paycrestTransaction.service.js';
export type {
  PaycrestTransactionFilters,
  PaginationOptions,
  PaycrestTransaction,
  PaycrestTransactionSummary,
  PaycrestTransactionsResult,
} from './paycrestTransaction.service.js';

// IDRX (On/Off-ramp)
export { idrxService } from './idrx/service.js';
export { idrxSyncService } from './idrx/sync.service.js';
export * from './idrx/types.js';

// Pretium (On/Off-ramp)
export { pretiumService } from './pretium.service.js';
export type {
  PretiumResponse,
  PretiumQuoteRequest,
  PretiumQuoteResponse,
  PretiumExchangeRateRequest,
  PretiumExchangeRateResponse,
  PretiumAsset,
  PretiumOnrampRequest,
  PretiumOnrampResponse,
  PretiumStatusResponse,
  PretiumDisbursementRequest,
  PretiumDisbursementResponse,
  PretiumNetwork
} from './pretium.service.js';

// TODO: Add other provider services as they are implemented
// export { yellowcardService } from './yellowcard.service.js';
// export { cngnService } from './cngn.service.js';
