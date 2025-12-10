/**
 * API Key Service
 * 
 * High-performance, secure API key management with LRU caching.
 * 
 * Security:
 * - HMAC-SHA256 key hashing with server-side salt
 * - Timing-safe comparisons
 * - Cryptographically secure key generation
 * - Key prefix validation before expensive hash operations
 * 
 * Performance:
 * - LRU cache with configurable TTL (default 5 min)
 * - Lazy validation (prefix check first)
 * - Async last-used updates (non-blocking)
 * - Batch operations support
 */

import crypto from 'crypto';
import { logger, log } from '../utils/logger.js';
// AppError available for future error handling enhancements

// =============================================================================
// TYPES
// =============================================================================

export interface ApiKeyData {
  id: string;
  userId?: string;
  appId?: string;
  keyId: string;
  hashedKey: string;
  name: string | null;
  environment: 'live' | 'test';
  permissions: string[];
  expiresAt: Date | null;
  lastUsed: Date | null;
  isActive: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyCreateInput {
  userId?: string;
  appId?: string;
  name?: string;
  environment?: 'live' | 'test';
  permissions?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyCreateResult {
  id: string;
  key: string;  // Full key - only shown once!
  keyId: string;
  prefix: string;
  name: string | null;
  environment: 'live' | 'test';
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ValidatedApiKey {
  id: string;
  userId?: string;
  appId?: string;
  keyId: string;
  name: string | null;
  permissions: string[];
  environment: 'live' | 'test';
}

export interface ApiKeyInfo {
  id: string;
  keyId: string;
  name: string | null;
  prefix: string;
  environment: 'live' | 'test';
  lastUsed: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

interface CacheEntry {
  data: ValidatedApiKey;
  expiresAt: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const KEY_PREFIX_LIVE = 'np_live_';
const KEY_PREFIX_TEST = 'np_test_';
const KEY_RANDOM_BYTES = 24; // 32 chars base64url
const KEY_ID_BYTES = 8; // 11 chars base64url for keyId
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 1000;
const HASH_ALGORITHM = 'sha256';

// =============================================================================
// LRU CACHE IMPLEMENTATION
// =============================================================================

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// =============================================================================
// API KEY SERVICE CLASS
// =============================================================================

class ApiKeyService {
  private readonly cache = new LRUCache<string, CacheEntry>(CACHE_MAX_SIZE);
  private readonly salt: string;

  constructor() {
    this.salt = process.env.API_KEY_SALT || process.env.ENCRYPTION_KEY || '';
    if (!this.salt) {
      logger.warn('API_KEY_SALT not configured - using fallback');
    }
  }

  // ===========================================================================
  // KEY GENERATION & HASHING
  // ===========================================================================

  /**
   * Generate a cryptographically secure API key
   * Format: np_{env}_{keyId}_{random}
   */
  private generateKey(environment: 'live' | 'test' = 'live'): { key: string; keyId: string } {
    const prefix = environment === 'test' ? KEY_PREFIX_TEST : KEY_PREFIX_LIVE;
    const keyId = crypto.randomBytes(KEY_ID_BYTES).toString('base64url');
    const random = crypto.randomBytes(KEY_RANDOM_BYTES).toString('base64url');
    return {
      key: `${prefix}${keyId}_${random}`,
      keyId,
    };
  }

  /**
   * Hash key using HMAC-SHA256 with server salt
   * Resistant to rainbow table attacks
   */
  private hashKey(key: string): string {
    const effectiveSalt = this.salt || 'nedapay_default_salt_change_in_production';
    return crypto
      .createHmac(HASH_ALGORITHM, effectiveSalt)
      .update(key)
      .digest('hex');
  }

  /**
   * Extract keyId from full key for quick lookups
   */
  private extractKeyId(key: string): string | null {
    // Format: np_live_KEYID_RANDOM or np_test_KEYID_RANDOM
    const match = key.match(/^np_(?:live|test)_([A-Za-z0-9_-]+)_/);
    return match?.[1] ?? null;
  }

  /**
   * Get visible prefix for display (first 16 chars)
   */
  private getDisplayPrefix(key: string): string {
    return key.substring(0, 16) + '...';
  }

  /**
   * Timing-safe key comparison
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  /**
   * Get from cache if valid
   */
  private getCached(key: string): ValidatedApiKey | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Add to cache
   */
  private setCache(key: string, data: ValidatedApiKey): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  /**
   * Invalidate cache for a key
   */
  invalidateCache(keyOrKeyId: string): void {
    this.cache.delete(keyOrKeyId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('API key cache cleared');
  }

  // ===========================================================================
  // KEY OPERATIONS (Abstract - implement with your storage)
  // ===========================================================================

  /**
   * Create a new API key
   * Returns the full key only once - store securely!
   */
  createKey(input: ApiKeyCreateInput): ApiKeyCreateResult {
    const environment = input.environment || (process.env.NODE_ENV === 'production' ? 'live' : 'test');
    const { key, keyId } = this.generateKey(environment);
    // Hash is computed but returned via getHashedKey() for storage
    this.hashKey(key); // Validate key is hashable
    const now = new Date();

    const result: ApiKeyCreateResult = {
      id: crypto.randomUUID(),
      key, // Only returned here!
      keyId,
      prefix: this.getDisplayPrefix(key),
      name: input.name || null,
      environment,
      expiresAt: input.expiresAt || null,
      createdAt: now,
    };

    // Log for audit (never log the full key!)
    log.audit('API key created', {
      userId: input.userId || 'system',
      resource: 'api_key',
      details: {
        keyId,
        environment,
        hasExpiration: !!input.expiresAt,
        appId: input.appId,
      }
    });

    // Return data needed for storage
    // The caller should store: id, userId, keyId, hashedKey, name, environment, permissions, expiresAt, metadata
    return result;
  }

  /**
   * Get the hashed key for storage
   * Call this with the full key from createKey result
   */
  getHashedKey(fullKey: string): string {
    return this.hashKey(fullKey);
  }

  // ===========================================================================
  // KEY VALIDATION
  // ===========================================================================

  /**
   * Validate an API key format (quick check, no DB)
   */
  isValidFormat(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    return key.startsWith(KEY_PREFIX_LIVE) || key.startsWith(KEY_PREFIX_TEST);
  }

  /**
   * Validate key against stored data
   * Uses cache for performance
   */
  validateKey(
    key: string,
    storedData: ApiKeyData
  ): ValidatedApiKey | null {
    // Quick format check
    if (!this.isValidFormat(key)) {
      return null;
    }

    // Check cache first
    const cached = this.getCached(key);
    if (cached) {
      return cached;
    }

    // Validate key ID matches
    const keyId = this.extractKeyId(key);
    if (!keyId || keyId !== storedData.keyId) {
      return null;
    }

    // Check if active
    if (!storedData.isActive) {
      return null;
    }

    // Check expiration
    if (storedData.expiresAt && storedData.expiresAt < new Date()) {
      return null;
    }

    // Verify hash (timing-safe)
    const providedHash = this.hashKey(key);
    if (!this.secureCompare(providedHash, storedData.hashedKey)) {
      return null;
    }

    // Build validated key object
    const validated: ValidatedApiKey = {
      id: storedData.id,
      userId: storedData.userId,
      appId: storedData.appId,
      keyId: storedData.keyId,
      name: storedData.name,
      permissions: storedData.permissions || [],
      environment: storedData.environment,
    };

    // Cache for future requests
    this.setCache(key, validated);

    return validated;
  }

  /**
   * Validate key by looking up in storage
   * Pass a lookup function that retrieves ApiKeyData by keyId
   */
  async validateKeyAsync(
    key: string,
    lookupByKeyId: (keyId: string) => Promise<ApiKeyData | null>,
    updateLastUsed?: (id: string) => Promise<void>
  ): Promise<ValidatedApiKey | null> {
    // Quick format check
    if (!this.isValidFormat(key)) {
      logger.debug('Invalid API key format');
      return null;
    }

    // Check cache
    const cached = this.getCached(key);
    if (cached) {
      // Fire-and-forget last used update
      if (updateLastUsed) {
        updateLastUsed(cached.id).catch(() => {});
      }
      return cached;
    }

    // Extract keyId for lookup
    const keyId = this.extractKeyId(key);
    if (!keyId) {
      logger.debug('Could not extract keyId from key');
      return null;
    }

    // Lookup in storage
    const storedData = await lookupByKeyId(keyId);
    if (!storedData) {
      logger.debug('API key not found', { keyId });
      return null;
    }

    // Validate against stored data
    const validated = this.validateKey(key, storedData);
    if (!validated) {
      logger.debug('API key validation failed', { keyId });
      return null;
    }

    // Fire-and-forget last used update
    if (updateLastUsed) {
      updateLastUsed(validated.id).catch(() => {});
    }

    return validated;
  }

  // ===========================================================================
  // PERMISSIONS
  // ===========================================================================

  /**
   * Check if key has specific permission
   * Supports wildcards: "*" (all), "resource:*" (all actions on resource)
   */
  hasPermission(validated: ValidatedApiKey, permission: string): boolean {
    const perms = validated.permissions;
    
    // No permissions = full access
    if (!perms || perms.length === 0) return true;
    
    // Check wildcards and exact matches
    return (
      perms.includes('*') ||
      perms.includes(permission) ||
      perms.some((p) => {
        if (p.endsWith(':*')) {
          return permission.startsWith(p.slice(0, -1));
        }
        return false;
      })
    );
  }

  /**
   * Check multiple permissions (AND logic)
   */
  hasAllPermissions(validated: ValidatedApiKey, permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(validated, p));
  }

  /**
   * Check multiple permissions (OR logic)
   */
  hasAnyPermission(validated: ValidatedApiKey, permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(validated, p));
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Extract environment from key
   */
  getEnvironment(key: string): 'live' | 'test' | null {
    if (key.startsWith(KEY_PREFIX_LIVE)) return 'live';
    if (key.startsWith(KEY_PREFIX_TEST)) return 'test';
    return null;
  }

  /**
   * Check if key is expired
   */
  isExpired(expiresAt: Date | null): boolean {
    return expiresAt !== null && expiresAt < new Date();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: CACHE_MAX_SIZE,
    };
  }

  /**
   * Generate a key ID (for external use)
   */
  generateKeyId(): string {
    return crypto.randomBytes(KEY_ID_BYTES).toString('base64url');
  }

  /**
   * Mask a key for logging/display
   */
  maskKey(key: string): string {
    if (!key || key.length < 20) return '****';
    return key.substring(0, 12) + '****' + key.substring(key.length - 4);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const apiKeyService = new ApiKeyService();

export default apiKeyService;
