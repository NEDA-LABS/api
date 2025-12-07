/**
 * IDRX Service
 * 
 * Integration with IDRX API for on/off-ramp operations in Indonesia.
 */

import crypto from 'crypto';
import { AppError } from '../../../errors/AppError.js';
import { logger } from '../../../utils/logger.js';

export class IdrxService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = process.env.IDRXCO_API_URL || 'https://idrx.co';
    this.apiKey = process.env.IDRXCO_API_KEY || '';
    this.secretKey = process.env.IDRXCO_SECRET_KEY || '';

    if (!this.apiKey || !this.secretKey) {
      logger.warn('IDRX credentials not configured. IDRX service will not function correctly.');
    }
  }

  /**
   * generate HMAC-SHA256 signature
   */
  private createSignature(
    method: string,
    url: string,
    body: Buffer | string | object | null,
    timestamp: string,
    secretKeyBase64: string
  ): string {
    // IDRX returns apiSecret as 64-char hex string in onboarding responses,
    // but some docs mention base64. Support both.
    const isHexFormat = /^[a-f0-9]{64}$/i.test(secretKeyBase64);

    let key: Buffer;
    if (isHexFormat) {
      key = Buffer.from(secretKeyBase64, 'hex');
    } else {
      key = Buffer.from(secretKeyBase64, 'base64');
    }

    const hmac = crypto.createHmac('sha256', key);

    const normalizedBody =
      body == null
        ? Buffer.from('')
        : Buffer.isBuffer(body)
        ? body
        : typeof body === 'string'
        ? Buffer.from(body)
        : Buffer.from(JSON.stringify(body));

    hmac.update(timestamp);
    hmac.update(method);
    hmac.update(url);
    if (normalizedBody.length) {
      hmac.update(normalizedBody);
    }
    
    return hmac.digest().toString('base64url');
  }

  /**
   * Get headers for IDRX API request
   */
  public getHeaders(method: string, path: string, body?: any) {
    const timestamp = Math.round(Date.now()).toString();
    const url = `${this.baseUrl}${path}`;
    
    if (!this.apiKey || !this.secretKey) {
      throw new AppError('IDRX credentials missing', 500);
    }

    const sig = this.createSignature(
      method,
      url,
      body ?? '',
      timestamp,
      this.secretKey
    );

    return {
      'idrx-api-key': this.apiKey,
      'idrx-api-sig': sig,
      'idrx-api-ts': timestamp,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify webhook signature
   */
  public verifyWebhookSignature(_payload: any, _signature: string): boolean {
    // TODO: Implement webhook verification logic
    // Usually involves re-creating the signature with the payload
    return true; 
  }

  /**
   * Fetch data from IDRX API
   */
  public async request<T>(method: string, path: string, body?: any): Promise<T> {
    const headers = this.getHeaders(method, path, body);
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`IDRX API Error: ${response.status} ${response.statusText}`, {
          url,
          body: errorText
        });
        throw new AppError(`IDRX API Error: ${response.statusText}`, response.status);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('IDRX Request Failed', error as Error);
      throw new AppError('Failed to communicate with IDRX', 500);
    }
  }

  /**
   * Get supported payment methods
   */
  public async getMethods() {
    return this.request('GET', '/api/v1/methods');
  }

  /**
   * Get KYC data for a user
   */
  public async getKycData(_userId: string) {
    // This likely requires user-specific credentials or mapping
    // Placeholder implementation
    return { status: 'Not implemented' };
  }
}

export const idrxService = new IdrxService();
