/**
 * Pretium Service
 * 
 * Integration with Pretium API for On-Ramp and Off-Ramp operations.
 * Supports: Malawi (MWK), DR Congo (CDF), Ethiopia (ETB), Ghana (GHS), Uganda (UGX), Kenya (KES).
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface PretiumResponse<T> {
  status: string;
  message: string;
  data?: T;
  error?: string;
  code?: number;
  statusCode?: number; // Frontend checks this
}

export interface PretiumQuoteRequest {
  source_currency: string;
  target_currency: string;
  amount: number;
  type: 'source' | 'target'; // whether amount is in source or target currency
}

export interface PretiumQuoteResponse {
  rate: number;
  source_amount: number;
  target_amount: number;
  fee: number;
  expires_at: string;
  quote_id: string;
}

export interface PretiumExchangeRateRequest {
  currency_code: string;
}

export interface PretiumExchangeRateResponse {
  buying_rate: number;
  selling_rate: number;
  quoted_rate: number;
}

export type PretiumAsset = 'USDT' | 'USDC' | 'CUSD';

export interface PretiumOnrampRequest {
  currency_code: string; // e.g. KES, MWK, CDF, GHS
  shortcode: string; // Customer phone number
  amount: number; // Amount to collect
  mobile_network: string;
  chain: string; // e.g. BASE, CELO
  asset: PretiumAsset;
  address: string; // recipient wallet address
  callback_url?: string;
}

export interface PretiumOnrampResponse {
  status: string; // PENDING
  transaction_code: string;
  message: string;
}

export interface PretiumStatusResponse {
  id?: number;
  transaction_code: string;
  status: string;
  amount?: string;
  amount_in_usd?: string;
  type?: string;
  shortcode?: string;
  account_number?: string | null;
  public_name?: string;
  receipt_number?: string;
  category?: string;
  chain?: string;
  asset?: string | null;
  transaction_hash?: string | null;
  message?: string;
  currency_code?: string;
  is_released?: boolean;
  created_at?: string;
}

export interface PretiumDisbursementRequest {
  quote_id?: string; // Optional now as we calculate locally
  destination: {
    type: 'mobile_money' | 'bank_account';
    account_number: string;
    account_name: string;
    bank_code?: string;
    network_code?: string;
    country: string;
  };
  reference?: string;
  callback_url?: string;
  
  // New fields for v1/pay
  transaction_hash: string;
  chain: string; // e.g. BASE, CELO
  target_amount?: number; // Fiat amount to disburse
}

export interface PretiumDisbursementResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference: string;
  created_at: string;
}

export interface PretiumNetwork {
  code: string;
  name: string;
  type: 'mobile_money' | 'bank';
  country: string;
}

export interface PretiumSupportedFiatCurrency {
  country: string; // ISO country code (e.g. "KE")
  currency_code: string; // ISO currency code (e.g. "KES")
}

export const SUPPORTED_COUNTRIES = {
  MW: 'Malawi',
  CD: 'DR Congo',
  ET: 'Ethiopia',
  // TZ: 'Tanzania (Test)',
  KE: 'Kenya (Test)',
  GH: 'Ghana',
  UG: 'Uganda',
};

export const SUPPORTED_FIAT_CURRENCIES: PretiumSupportedFiatCurrency[] = [
  { country: 'MW', currency_code: 'MWK' },
  { country: 'CD', currency_code: 'CDF' },
  { country: 'ET', currency_code: 'ETB' },
  { country: 'KE', currency_code: 'KES' },
  { country: 'GH', currency_code: 'GHS' },
  { country: 'UG', currency_code: 'UGX' },
];

export const PRETIUM_NETWORKS: Record<string, PretiumNetwork[]> = {
  MW: [
    { code: 'Airtel Money', name: 'Airtel Money', type: 'mobile_money', country: 'MW' },
    { code: 'TNM Mpamba', name: 'TNM Mpamba', type: 'mobile_money', country: 'MW' },
  ],
  CD: [
    { code: 'Airtel Money', name: 'Airtel Money', type: 'mobile_money', country: 'CD' },
    { code: 'Mpesa', name: 'Mpesa', type: 'mobile_money', country: 'CD' },
    { code: 'Orange Money', name: 'Orange Money', type: 'mobile_money', country: 'CD' },
  ],
  ET: [
    { code: 'Telebirr', name: 'Telebirr', type: 'mobile_money', country: 'ET' },
    { code: 'Cbe Birr', name: 'Cbe Birr', type: 'mobile_money', country: 'ET' },
    { code: 'Mpesa', name: 'Mpesa', type: 'mobile_money', country: 'ET' },
  ],
  KE: [
    { code: 'Safaricom', name: 'Safaricom', type: 'mobile_money', country: 'KE' },
    { code: 'Airtel', name: 'Airtel', type: 'mobile_money', country: 'KE' },
  ],
  GH: [
    { code: 'MTN MoMo', name: 'MTN MoMo', type: 'mobile_money', country: 'GH' },
    { code: 'AirtelTigo Money', name: 'AirtelTigo Money', type: 'mobile_money', country: 'GH' },
    { code: 'Telecel Cash', name: 'Telecel Cash', type: 'mobile_money', country: 'GH' },
  ],
  UG: [
    { code: 'MTN', name: 'MTN', type: 'mobile_money', country: 'UG' },
    { code: 'Airtel', name: 'Airtel', type: 'mobile_money', country: 'UG' },
  ],
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

class PretiumService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.services.pretium.baseUrl;
    this.apiKey = config.services.pretium.apiKey || '';
    
    if (!this.apiKey) {
      logger.warn('Pretium API Key is not configured');
    }
  }

  /**
   * Create an onramp (deposit) transaction
   */
  async createOnramp(request: PretiumOnrampRequest): Promise<PretiumResponse<PretiumOnrampResponse>> {
    const currency = request.currency_code;
    const countryCode =
      currency === 'KES' ? 'KE' :
      currency === 'MWK' ? 'MW' :
      currency === 'CDF' ? 'CD' :
      currency === 'ETB' ? 'ET' :
      currency === 'GHS' ? 'GH' :
      currency === 'UGX' ? 'UG' : undefined;
      
    const body = {
      shortcode: request.shortcode,
      amount: request.amount,
      mobile_network: this.normalizeMobileNetwork(countryCode, request.mobile_network),
      chain: request.chain || 'BASE',
      asset: request.asset,
      address: request.address,
      fee: this.calculateFee(Number(request.amount || 0)),
      callback_url: request.callback_url || this.getCallbackUrl(),
    };

    return this.request<PretiumOnrampResponse>('POST', `/v1/onramp/${currency}`, body);
  }

  /**
   * Get transaction status by transaction_code
   */
  async getStatus(currencyCode: string, transactionCode: string): Promise<PretiumResponse<PretiumStatusResponse>> {
    return this.request<PretiumStatusResponse>('POST', `/v1/status/${currencyCode}`, {
      transaction_code: transactionCode,
    });
  }

  /**
   * Get exchange rate for a fiat currency
   */
  async getExchangeRate(currencyCode: string): Promise<PretiumResponse<PretiumExchangeRateResponse>> {
    return this.request<PretiumExchangeRateResponse>('POST', '/v1/exchange-rate', {
      currency_code: currencyCode,
    });
  }

  /**
   * Get exchange rate (used as quote)
   */
  async getQuote(request: PretiumQuoteRequest): Promise<PretiumResponse<PretiumQuoteResponse>> {
    try {
      // 1. Get the rate
      const rateRes = await this.request<PretiumExchangeRateResponse>('POST', '/v1/exchange-rate', {
        currency_code: request.target_currency
      });

      if (rateRes.status === 'error' || !rateRes.data) {
        return {
          status: 'error',
          message: rateRes.message || 'Failed to fetch rates',
          code: rateRes.code,
          statusCode: rateRes.statusCode || rateRes.code || 400,
          error: rateRes.error
        };
      }

      // 2. Calculate amounts
      const rate = rateRes.data.buying_rate; 
      
      const sourceAmount = request.amount;
      const targetAmount = sourceAmount * rate;
      const fee = 0; // The API docs mention fee field but not how to calculate it from rate endpoint.

      return {
        status: 'success',
        message: 'success',
        statusCode: 200,
        data: {
          rate: rate,
          source_amount: sourceAmount,
          target_amount: targetAmount,
          fee: fee,
          expires_at: new Date(Date.now() + 15 * 60000).toISOString(), // Mock expiry
          quote_id: 'mock-quote-id-' + Date.now(), 
        }
      };
    } catch (e: any) {
      return {
        status: 'error',
        message: e.message,
        code: 500,
        statusCode: 500
      };
    }
  }

  async getAccountDetail(): Promise<PretiumResponse<any>> {
    // Primary: POST {{uri}}/account/detail
    const primary = await this.request<any>('POST', '/account/detail', {});
    if (primary.status === 'success') return primary;
    // Fallback: some deployments use /v1/account/detail
    const fallback = await this.request<any>('POST', '/v1/account/detail', {});
    return fallback;
  }

  /**
   * Create a disbursement (payout)
   */
  async createDisbursement(request: PretiumDisbursementRequest): Promise<PretiumResponse<PretiumDisbursementResponse>> {
    const currency = request.destination.country === 'MW' ? 'MWK' : 
                    request.destination.country === 'CD' ? 'CDF' : 
                    request.destination.country === 'ET' ? 'ETB' :
                    request.destination.country === 'TZ' ? 'TZS' :
                    request.destination.country === 'KE' ? 'KES' :
                    request.destination.country === 'GH' ? 'GHS' : 'MWK';
    
    const amountNumber = typeof request.target_amount === 'number' ? request.target_amount : Number(request.target_amount);
    const body = {
      type: request.destination.type === 'bank_account' ? 'PAYBILL' : 'MOBILE',
      shortcode: request.destination.account_number,
      amount: request.target_amount?.toString(),
      fee: this.calculateFee(Number.isFinite(amountNumber) ? amountNumber : 0),
      mobile_network: this.normalizeMobileNetwork(request.destination.country, request.destination.network_code),
      country: request.destination.country,
      chain: request.chain || "BASE",
      transaction_hash: request.transaction_hash,
      callback_url: request.callback_url || this.getCallbackUrl()
    };

    return this.request<PretiumDisbursementResponse>('POST', `/v1/pay/${currency}`, body);
  }

  /**
   * Get disbursement status
   */
  async getDisbursementStatus(id: string): Promise<PretiumResponse<PretiumDisbursementResponse>> {
    return this.request<PretiumDisbursementResponse>('GET', `/payouts/${id}`);
  }

  /**
   * Get exchange rates
   */
  async getRates(base: string = 'USD'): Promise<PretiumResponse<any>> {
    return this.request<any>('GET', `/rates?base=${base}`);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private calculateFee(amount: number): string {
    // Pretium API rejects fee <= 0. Use 0.5% and clamp to a minimal positive value.
    const fee = amount * 0.005;
    const clamped = Math.max(0.01, fee);
    return clamped.toFixed(2);
  }

  private normalizeMobileNetwork(countryCode: string | undefined, mobileNetwork: string | undefined): string {
    const raw = String(mobileNetwork || '').trim();
    const upper = raw.toUpperCase();
    const cc = String(countryCode || '').toUpperCase();

    if (cc === 'KE') {
      if (upper === 'MPESA' || upper === 'M-PESA' || upper === 'M_PESA') return 'Safaricom';
      if (upper === 'SAFARICOM') return 'Safaricom';
      if (upper === 'AIRTEL' || upper === 'AIRTELMONEY' || upper === 'AIRTEL_MONEY') return 'Airtel';
    }

    if (cc === 'GH') {
      if (upper === 'MTN') return 'MTN MoMo';
      if (upper === 'MTN MOMO' || upper === 'MTN_MOMO') return 'MTN MoMo';
      if (upper === 'AIRTELTIGO') return 'AirtelTigo Money';
      if (upper === 'TELECEL') return 'Telecel Cash';
    }

    if (cc === 'UG') {
      if (upper === 'MTN' || upper === 'MTN MOMO' || upper === 'MTN_MOMO') return 'MTN';
      if (upper === 'AIRTEL' || upper === 'AIRTELMONEY' || upper === 'AIRTEL_MONEY') return 'Airtel';
    }

    return raw;
  }

  private getCallbackUrl(): string {
    const baseUrl = config.webhook.baseUrl || `http://${config.host}:${config.port}`;
    return `${baseUrl.replace(/\/$/, '')}/api/v1/ramp/pretium/webhook`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<PretiumResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
    };

    logger.debug(`[Pretium] Request: ${method} ${url}`, { body });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const raw = await response.text();
        logger.error(`[Pretium] Non-JSON response`, { status: response.status, raw: raw.slice(0, 500) });
        return {
          status: 'error',
          message: 'Invalid response from Pretium (non-JSON)',
          code: response.status || 500,
          error: raw,
        };
      }

      const data = await response.json() as any;
      
      if (!response.ok) {
        logger.error(`[Pretium] Request failed`, { status: response.status, data });
        return {
          status: 'error',
          message: data.message || `Request failed: ${response.status}`,
          code: response.status,
          statusCode: response.status,
          error: data.error || data.message,
        };
      }

      return {
        status: 'success',
        message: 'success',
        data: data.data || data,
        statusCode: 200,
      };
    } catch (error: any) {
      logger.error(`[Pretium] Request error`, error);
      return {
        status: 'error',
        message: error.message || 'Network error',
        code: 500,
        statusCode: 500,
        error: error.toString(),
      };
    }
  }

  /**
   * Verify webhook signature
   * Note: The docs don't specify the signature algorithm clearly, 
   * so this is a placeholder or needs to be adapted to their actual mechanism.
   * Assuming standard HMAC-SHA256 if secret is provided.
   */
  verifyWebhookSignature(_payload: any, _signature: string): boolean {
    const secret = config.services.pretium.webhookSecret;
    if (!secret) return true; // If no secret configured, accept (warned on startup)
    
    // TODO: Implement actual signature verification based on Pretium docs
    // For now, return true to allow processing
    return true;
  }
}

export const pretiumService = new PretiumService();
