/**
 * Snaville Service
 * 
 * Integration with Snaville API for Tanzania USDT On-Ramp/Off-Ramp via Mobile Money.
 * API Docs: https://api.snaville.com/docs
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface SnavilleResponse<T> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface SnavilleRates {
  buy_rate: number;  // TZS per USDT for buying USDT
  sell_rate: number; // TZS per USDT for selling USDT
}

export interface SnavilleLimits {
  min_usdt: number;
  max_usdt: number;
}

export interface SnavilleRatesResponse {
  rates: SnavilleRates;
  limits: SnavilleLimits;
}

export interface SnavillePaymentMethod {
  id: string;           // e.g., 'mpesa', 'tigopesa', 'airtelmoney', 'halopesa'
  provider: string;     // e.g., 'M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Halo Pesa'
  account_number: string;
  account_name: string;
  instructions: string;
}

export interface SnavillePaymentMethodsResponse {
  timestamp: string;
  payment_methods: SnavillePaymentMethod[];
}

export type SnavilleNetwork = 'BEP20' | 'TRC20';

export interface SnavilleBuyOrderRequest {
  partner_order_id: string;
  amount_usdt: number;
  destination_address: string;
  payment_method_id: string;
  user_full_name: string;
  user_phone: string;
  network: SnavilleNetwork;
}

export interface SnavillePaymentInstructions {
  provider: string;
  account_number: string;
  account_name: string;
  amount_to_send: number;
}

export interface SnavilleBuyOrder {
  order_number: string;
  status: SnavilleOrderStatus;
  amount_usdt: number;
  amount_tzs: number;
  payment_instructions: SnavillePaymentInstructions;
  expires_at: string;
}

export interface SnavilleBuyOrderResponse {
  order: SnavilleBuyOrder;
}

export interface SnavilleVerifyPaymentRequest {
  order_number: string;
  transaction_id: string; // Mobile money transaction ID
}

export interface SnavilleVerifyPaymentResponse {
  success: boolean;
  message?: string;
}

export interface SnavilleSellOrderRequest {
  partner_order_id: string;
  amount_usdt: number;
  recipient_phone: string;
}

export interface SnavilleSellDeposit {
  amount: number;
  wallet: string;
  network: SnavilleNetwork;
  tx_hash?: string;
  confirmed_at?: string;
}

export interface SnavilleSellPayout {
  phone: string;
  provider: string;
  amount_tzs: number;
  rate: number;
  transaction_id?: string;
}

export interface SnavilleSellOrder {
  snaville_order_id: string;
  order_number: string;
  partner_order_id: string;
  type: 'sell';
  status: SnavilleOrderStatus;
  deposit: SnavilleSellDeposit;
  payout: SnavilleSellPayout;
  expires_at: string;
  created_at: string;
}

export interface SnavilleSellOrderResponse {
  order: SnavilleSellOrder;
}

export type SnavilleOrderStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface SnavilleOrderStatusResponse {
  order: SnavilleBuyOrder | SnavilleSellOrder;
}

export type SnavilleWebhookEvent = 
  | 'order.completed'
  | 'order.payment_received'
  | 'order.failed'
  | 'order.expired';

export interface SnavilleWebhookPayload {
  event: SnavilleWebhookEvent;
  timestamp: string;
  order: {
    snaville_order_id: string;
    order_number: string;
    partner_order_id: string;
    type: 'buy' | 'sell';
    status: SnavilleOrderStatus;
    amount_usdt?: number;
    amount_tzs?: number;
    destination_address?: string;
    network?: SnavilleNetwork;
    tx_hash?: string;
    explorer_url?: string;
    deposit?: SnavilleSellDeposit;
    payout?: SnavilleSellPayout;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SNAVILLE_CONFIG = {
  SUPPORTED_NETWORKS: ['BEP20'] as const,
  CURRENCY: 'TZS',
  COUNTRY_CODE: 'TZ',
  MIN_AMOUNT_USDT: 1,
  MAX_AMOUNT_USDT: 10000,
} as const;

export const SNAVILLE_PAYMENT_METHODS: Record<string, string> = {
  mpesa: 'M-Pesa (Vodacom)',
  tigopesa: 'Mixx by Yas (Tigo)',
  airtelmoney: 'Airtel Money',
  halopesa: 'Halo Pesa',
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

class SnavilleService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.services.snaville.apiUrl || 'https://api.snaville.com/v1/partner';
    this.apiKey = config.services.snaville.apiKey || '';
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, any>
  ): Promise<SnavilleResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    try {
      logger.info(`[Snaville] ${method} ${endpoint}`, { body: body ? JSON.stringify(body).slice(0, 200) : undefined });
      
      const response = await fetch(url, options);
      const data = await response.json() as Record<string, any>;

      logger.info(`[Snaville] Response status: ${response.status}`, { data: JSON.stringify(data).slice(0, 500) });

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error: any) {
      logger.error(`[Snaville] Request failed:`, error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // ===========================================================================
  // RATES
  // ===========================================================================

  async getRates(): Promise<SnavilleResponse<SnavilleRatesResponse>> {
    return this.request<SnavilleRatesResponse>('GET', '/rates');
  }

  // ===========================================================================
  // PAYMENT METHODS
  // ===========================================================================

  async getPaymentMethods(): Promise<SnavilleResponse<SnavillePaymentMethodsResponse>> {
    return this.request<SnavillePaymentMethodsResponse>('GET', '/payment-methods');
  }

  // ===========================================================================
  // BUY ORDER (ON-RAMP)
  // ===========================================================================

  async createBuyOrder(
    request: SnavilleBuyOrderRequest
  ): Promise<SnavilleResponse<SnavilleBuyOrderResponse>> {
    return this.request<SnavilleBuyOrderResponse>('POST', '/onramp', request);
  }

  async verifyPayment(
    request: SnavilleVerifyPaymentRequest
  ): Promise<SnavilleResponse<SnavilleVerifyPaymentResponse>> {
    return this.request<SnavilleVerifyPaymentResponse>('POST', '/onramp/verify', request);
  }

  // ===========================================================================
  // SELL ORDER (OFF-RAMP)
  // ===========================================================================

  async createSellOrder(
    request: SnavilleSellOrderRequest
  ): Promise<SnavilleResponse<SnavilleSellOrderResponse>> {
    return this.request<SnavilleSellOrderResponse>('POST', '/offramp', request);
  }

  // ===========================================================================
  // ORDER STATUS
  // ===========================================================================

  async getOrderStatus(
    orderNumber: string
  ): Promise<SnavilleResponse<SnavilleOrderStatusResponse>> {
    return this.request<SnavilleOrderStatusResponse>('GET', `/orders/${orderNumber}`);
  }

  // ===========================================================================
  // WEBHOOK SIGNATURE VERIFICATION
  // ===========================================================================

  /**
   * Verify Snaville webhook signature
   * Format: X-Webhook-Signature: t=1706104500,v1=5d41402abc4b2a76b9719d911017c592
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = config.services.snaville.webhookSecret;
    if (!secret) {
      logger.warn('[Snaville] No webhook secret configured, skipping verification');
      return true; // Allow if no secret configured
    }

    try {
      const [tPart, v1Part] = signature.split(',');
      const timestamp = tPart?.split('=')[1];
      const expectedSig = v1Part?.split('=')[1];

      if (!timestamp || !expectedSig) {
        logger.error('[Snaville] Invalid signature format');
        return false;
      }

      const signedPayload = `${timestamp}.${payload}`;
      const computedSig = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      return computedSig === expectedSig;
    } catch (error) {
      logger.error('[Snaville] Signature verification error:', error);
      return false;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  generateOrderId(prefix: string = 'NEDA'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  calculateTZSAmount(usdtAmount: number, buyRate: number): number {
    return Math.round(usdtAmount * buyRate);
  }

  calculateUSDTAmount(tzsAmount: number, buyRate: number): number {
    return tzsAmount / buyRate;
  }
}

// Export singleton instance
export const snavilleService = new SnavilleService();
export default snavilleService;
