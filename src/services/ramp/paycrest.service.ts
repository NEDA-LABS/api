/**
 * Paycrest Service
 * 
 * Full integration with Paycrest API for off-ramp operations.
 * Handles payment orders, account verification, rates, institutions, and webhooks.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../errors/AppError.js';

// =============================================================================
// TYPES
// =============================================================================

export interface PaycrestRecipient {
  institution: string;
  accountIdentifier: string;
  accountName: string;
  currency?: string;
  memo?: string;
  providerId?: string;
}

export interface PaycrestOrderPayload {
  amount: number;
  rate: number;
  network: string;
  token: string;
  recipient: PaycrestRecipient;
  returnAddress?: string;
  reference?: string;
}

export interface PaycrestOrder {
  id: string;
  amount: string;
  amountPaid: string;
  amountReturned: string;
  token: string;
  senderFee: string;
  transactionFee: string;
  rate: string;
  network: string;
  gatewayId: string;
  reference: string;
  recipient: PaycrestRecipient;
  fromAddress: string;
  returnAddress: string;
  receiveAddress: string;
  feeAddress: string;
  createdAt: string;
  updatedAt: string;
  txHash: string;
  status: PaycrestOrderStatus;
}

export type PaycrestOrderStatus = 
  | 'pending'
  | 'initiated'
  | 'processing'
  | 'settled'
  | 'refunded'
  | 'expired'
  | 'failed';

export interface PaycrestOrderResponse {
  message: string;
  status: string;
  data: {
    id: string;
    amount: string;
    token: string;
    network: string;
    receiveAddress: string;
    validUntil: string;
    senderFee: string;
    transactionFee: string;
    reference?: string;
  };
}

export interface PaycrestOrdersResponse {
  message: string;
  status: string;
  data: {
    total: number;
    page: number;
    pageSize: number;
    orders: PaycrestOrder[];
    summary?: PaycrestOrdersSummary;
  };
}

export interface PaycrestOrdersSummary {
  totalTransactions: number;
  totalAmount: number;
  totalAmountPaid: number;
  totalFees: number;
  byStatus: Record<string, number>;
  byToken: Record<string, { count: number; totalAmount: number; totalPaid: number }>;
  byNetwork: Record<string, number>;
  recentActivity: Record<string, number>;
}

export interface PaycrestInstitution {
  id: string;
  code: string;
  name: string;
  type: 'bank' | 'mobile_money';
  country: string;
  currency: string;
}

export interface PaycrestCurrency {
  code: string;
  name: string;
  shortName: string;
  decimals: number;
  symbol: string;
  marketRate: string;
}

export interface PaycrestAccountVerification {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

export interface PaycrestWebhookPayload {
  event: PaycrestWebhookEvent;
  data: PaycrestOrder;
}

export type PaycrestWebhookEvent = 
  | 'payment_order.pending'
  | 'payment_order.initiated'
  | 'payment_order.processing'
  | 'payment_order.settled'
  | 'payment_order.refunded'
  | 'payment_order.expired'
  | 'payment_order.failed';

export interface FetchOrdersParams {
  ordering?: 'asc' | 'desc';
  status?: PaycrestOrderStatus;
  token?: string;
  network?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAYCREST_API_URL = config.services.paycrest.apiUrl || 'https://api.paycrest.io';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;

const RETRYABLE_ERROR_CODES = ['ETIMEDOUT', 'ENETUNREACH', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'];

// Supported networks mapping
const NETWORK_MAP: Record<string, string> = {
  'ethereum': 'ethereum',
  'polygon': 'polygon',
  'arbitrum': 'arbitrum-one',
  'optimism': 'optimism',
  'base': 'base',
  'bnb': 'bnb-smart-chain',
  'avalanche': 'avalanche',
  'tron': 'tron',
};

// Supported tokens
const SUPPORTED_TOKENS = ['USDT', 'USDC', 'DAI', 'BUSD'] as const;
export type SupportedToken = typeof SUPPORTED_TOKENS[number];

// =============================================================================
// PAYCREST SERVICE CLASS
// =============================================================================

class PaycrestService {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = config.services.paycrest.clientId || '';
    this.clientSecret = config.services.paycrest.clientSecret || '';

    this.client = axios.create({
      baseURL: PAYCREST_API_URL,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'API-Key': this.clientId,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        logger.debug('Paycrest API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
        });
        return config;
      },
      (error: any) => {
        logger.error('Paycrest request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('Paycrest API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: any) => {
        if (axios.isAxiosError(error)) {
          logger.error('Paycrest API error', error, {
            status: error.response?.status,
            url: error.config?.url,
            data: error.response?.data,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  // ===========================================================================
  // INITIALIZATION CHECK
  // ===========================================================================

  private ensureInitialized(): void {
    if (!this.clientId) {
      throw new AppError(
        'Paycrest client ID not configured',
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  // ===========================================================================
  // RETRY LOGIC
  // ===========================================================================

  private isRetryableError(error: AxiosError): boolean {
    if (!error.code) return false;
    return RETRYABLE_ERROR_CODES.includes(error.code);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (axios.isAxiosError(error) && this.isRetryableError(error) && attempt < retries) {
          logger.warn(`Paycrest request failed, retrying (${attempt + 1}/${retries})`, {
            error: error.message,
            code: error.code,
          });
          await this.delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  private handleApiError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;

      logger.error(`Paycrest ${context} failed`, error, {
        status,
        response: error.response?.data,
      });

      throw new AppError(
        `Paycrest ${context}: ${message}`,
        status,
        'EXTERNAL_SERVICE_ERROR'
      );
    }

    throw new AppError(
      `Paycrest ${context}: Unknown error`,
      500,
      'INTERNAL_ERROR'
    );
  }

  // ===========================================================================
  // PAYMENT ORDERS
  // ===========================================================================

  /**
   * Create a new payment order
   */
  async createOrder(payload: PaycrestOrderPayload): Promise<PaycrestOrderResponse> {
    this.ensureInitialized();

    // Validate payload
    if (!payload.amount || payload.amount <= 0) {
      throw new AppError('Invalid amount', 400, 'VALIDATION_ERROR');
    }

    if (!payload.recipient?.accountIdentifier) {
      throw new AppError('Recipient account required', 400, 'VALIDATION_ERROR');
    }

    if (!SUPPORTED_TOKENS.includes(payload.token as SupportedToken)) {
      throw new AppError(`Unsupported token: ${payload.token}`, 400, 'VALIDATION_ERROR');
    }

    try {
      const response = await this.withRetry(() =>
        this.client.post<PaycrestOrderResponse>('/v1/sender/orders', {
          amount: payload.amount,
          rate: payload.rate,
          network: this.normalizeNetwork(payload.network),
          token: payload.token,
          recipient: payload.recipient,
          returnAddress: payload.returnAddress,
          reference: payload.reference || `np_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        })
      );

      logger.info('Paycrest order created', {
        orderId: response.data.data.id,
        amount: payload.amount,
        token: payload.token,
        network: payload.network,
      });

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'create order');
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<PaycrestOrder> {
    this.ensureInitialized();

    try {
      const response = await this.withRetry(() =>
        this.client.get<{ data: PaycrestOrder }>(`/v1/sender/orders/${orderId}`)
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'get order');
    }
  }

  /**
   * List orders with optional filters
   */
  async listOrders(params: FetchOrdersParams = {}): Promise<PaycrestOrdersResponse> {
    this.ensureInitialized();

    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.token) queryParams.append('token', params.token);
    if (params.network) queryParams.append('network', params.network);
    if (params.ordering) queryParams.append('ordering', params.ordering);
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    try {
      const queryString = queryParams.toString();
      const url = `/v1/sender/orders${queryString ? `?${queryString}` : ''}`;

      const response = await this.withRetry(() =>
        this.client.get<PaycrestOrdersResponse>(url)
      );

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'list orders');
    }
  }

  // ===========================================================================
  // RATES
  // ===========================================================================

  /**
   * Get exchange rate for a token/fiat pair
   */
  async getRate(
    token: string,
    amount: number,
    fiatCurrency: string,
    network?: string
  ): Promise<string> {
    this.ensureInitialized();

    try {
      const params = new URLSearchParams();
      if (network) params.append('network', this.normalizeNetwork(network));

      const response = await this.withRetry(() =>
        this.client.get<{ data: string }>(
          `/v1/rates/${token}/${amount}/${fiatCurrency}${params.toString() ? `?${params}` : ''}`
        )
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'get rate');
    }
  }

  /**
   * Get rates for multiple amounts
   */
  async getBulkRates(
    token: string,
    amounts: number[],
    fiatCurrency: string,
    network?: string
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    await Promise.all(
      amounts.map(async (amount) => {
        try {
          const rate = await this.getRate(token, amount, fiatCurrency, network);
          results.set(amount, rate);
        } catch {
          results.set(amount, '0');
        }
      })
    );

    return results;
  }

  // ===========================================================================
  // ACCOUNT VERIFICATION
  // ===========================================================================

  /**
   * Verify a bank/mobile money account
   */
  async verifyAccount(
    institution: string,
    accountIdentifier: string
  ): Promise<PaycrestAccountVerification> {
    this.ensureInitialized();

    if (!institution || !accountIdentifier) {
      throw new AppError(
        'Institution and account identifier required',
        400,
        'VALIDATION_ERROR'
      );
    }

    try {
      const response = await this.withRetry(() =>
        this.client.post<{ data: PaycrestAccountVerification }>('/v1/verify-account', {
          institution,
          accountIdentifier,
        })
      );

      logger.debug('Account verified', {
        institution,
        accountName: response.data.data.accountName,
      });

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'verify account');
    }
  }

  // ===========================================================================
  // INSTITUTIONS & CURRENCIES
  // ===========================================================================

  /**
   * Get supported institutions for a currency
   */
  async getInstitutions(currencyCode: string): Promise<PaycrestInstitution[]> {
    this.ensureInitialized();

    try {
      const response = await this.withRetry(() =>
        this.client.get<{ data: PaycrestInstitution[] }>(`/v1/institutions/${currencyCode}`)
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'get institutions');
    }
  }

  /**
   * Get supported currencies
   */
  async getCurrencies(): Promise<PaycrestCurrency[]> {
    this.ensureInitialized();

    try {
      const response = await this.withRetry(() =>
        this.client.get<{ data: PaycrestCurrency[] }>('/v1/currencies')
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'get currencies');
    }
  }

  /**
   * Get supported networks
   */
  async getNetworks(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const response = await this.withRetry(() =>
        this.client.get<{ data: string[] }>('/v1/networks')
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'get networks');
    }
  }

  // ===========================================================================
  // WEBHOOKS
  // ===========================================================================

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.clientSecret) {
      logger.warn('Paycrest client secret not configured for webhook verification');
      return false;
    }

    const calculatedSignature = crypto
      .createHmac('sha256', Buffer.from(this.clientSecret))
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  /**
   * Parse and validate webhook payload
   */
  parseWebhook(
    rawPayload: string,
    signature: string
  ): PaycrestWebhookPayload | null {
    if (!this.verifyWebhookSignature(rawPayload, signature)) {
      logger.warn('Invalid Paycrest webhook signature');
      return null;
    }

    try {
      const payload = JSON.parse(rawPayload) as PaycrestWebhookPayload;
      
      logger.info('Paycrest webhook received', {
        event: payload.event,
        orderId: payload.data?.id,
      });

      return payload;
    } catch (error) {
      logger.error('Failed to parse Paycrest webhook', error as Error);
      return null;
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Normalize network name to Paycrest format
   */
  private normalizeNetwork(network: string): string {
    const normalized = network.toLowerCase().replace(/[^a-z0-9]/g, '');
    return NETWORK_MAP[normalized] || network;
  }

  /**
   * Map order status to internal status
   */
  mapOrderStatus(status: PaycrestOrderStatus): string {
    const statusMap: Record<PaycrestOrderStatus, string> = {
      pending: 'PENDING',
      initiated: 'PROCESSING',
      processing: 'PROCESSING',
      settled: 'COMPLETED',
      refunded: 'REFUNDED',
      expired: 'EXPIRED',
      failed: 'FAILED',
    };

    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.clientId;
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { healthy: false, error: 'Not configured' };
    }

    const start = Date.now();

    try {
      await this.getCurrencies();
      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const paycrestService = new PaycrestService();
export default paycrestService;
