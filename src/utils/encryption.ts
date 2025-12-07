/**
 * Encryption Utility
 * 
 * Provides AES-256-GCM encryption with proper security practices:
 * - Unique IV per encryption
 * - Authentication tags for integrity verification
 * - Multiple key support for different contexts
 * - Key derivation from environment variables
 * - Secure key rotation support
 */

import crypto from 'crypto';
// Config import reserved for future use
import { logger } from './logger.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM (recommended by NIST)
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 32; // Reserved for key derivation
const PBKDF2_ITERATIONS = 100000;

// Key context identifiers for different encryption purposes
export enum KeyContext {
  API_CREDENTIALS = 'api_credentials',
  USER_SECRETS = 'user_secrets',
  INTERNAL = 'internal',
  DEFAULT = 'default',
}

// =============================================================================
// KEY MANAGEMENT
// =============================================================================

/**
 * Key cache to avoid re-deriving keys on every operation
 */
const keyCache = new Map<string, Buffer>();

/**
 * Get the master encryption key from environment
 */
function getMasterKey(context: KeyContext = KeyContext.DEFAULT): Buffer {
  const cacheKey = `master_${context}`;
  
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  // Try context-specific key first, then fallback to general key
  const keyEnvMap: Record<KeyContext, string[]> = {
    [KeyContext.API_CREDENTIALS]: ['API_CREDENTIALS_KEY', 'IDRX_ENC_KEY', 'ENCRYPTION_KEY'],
    [KeyContext.USER_SECRETS]: ['USER_SECRETS_KEY', 'ENCRYPTION_KEY'],
    [KeyContext.INTERNAL]: ['INTERNAL_ENC_KEY', 'ENCRYPTION_KEY'],
    [KeyContext.DEFAULT]: ['ENCRYPTION_KEY', 'IDRX_ENC_KEY'],
  };

  const envVars = keyEnvMap[context] || keyEnvMap[KeyContext.DEFAULT];
  
  let rawKey: string | undefined;
  for (const envVar of envVars) {
    rawKey = process.env[envVar];
    if (rawKey) break;
  }

  if (!rawKey) {
    throw new EncryptionError(
      `Missing encryption key. Set one of: ${envVars.join(', ')}`,
      'MISSING_KEY'
    );
  }

  const key = normalizeKey(rawKey);
  keyCache.set(cacheKey, key);
  return key;
}

/**
 * Normalize a key from various formats (base64, hex, utf-8) to a 32-byte buffer
 */
function normalizeKey(raw: string): Buffer {
  // Try base64
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === KEY_LENGTH) return buf;
    if (buf.length > KEY_LENGTH) return buf.subarray(0, KEY_LENGTH);
  } catch {
    // Not valid base64
  }

  // Try hex
  try {
    const buf = Buffer.from(raw, 'hex');
    if (buf.length === KEY_LENGTH) return buf;
    if (buf.length > KEY_LENGTH) return buf.subarray(0, KEY_LENGTH);
  } catch {
    // Not valid hex
  }

  // Use raw UTF-8 with PBKDF2 derivation for non-standard keys
  const utf8 = Buffer.from(raw, 'utf-8');
  if (utf8.length === KEY_LENGTH) return utf8;

  // Derive a proper key using PBKDF2
  const salt = crypto.createHash('sha256').update('nedapay_key_salt').digest();
  return crypto.pbkdf2Sync(utf8, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Derive a context-specific key from the master key
 */
function deriveContextKey(masterKey: Buffer, context: string): Buffer {
  const info = Buffer.from(context, 'utf-8');
  return crypto.createHmac('sha256', masterKey).update(info).digest();
}

/**
 * Clear the key cache (for key rotation)
 */
export function clearKeyCache(): void {
  keyCache.clear();
  logger.info('Encryption key cache cleared');
}

// =============================================================================
// ENCRYPTION / DECRYPTION
// =============================================================================

/**
 * Custom error class for encryption errors
 */
export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'ENCRYPTION_ERROR'
  ) {
    super(message);
    this.name = 'EncryptionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Encrypt plaintext to a base64-encoded string
 * 
 * Output format: base64(version(1) + iv(12) + ciphertext + authTag(16))
 * 
 * @param plainText - The text to encrypt
 * @param context - The key context to use
 * @returns Base64-encoded encrypted data
 */
export function encrypt(
  plainText: string,
  context: KeyContext = KeyContext.DEFAULT
): string {
  try {
    const masterKey = getMasterKey(context);
    const contextKey = deriveContextKey(masterKey, context);
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, contextKey, iv);
    
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Version byte for future format changes
    const version = Buffer.from([0x01]);
    
    return Buffer.concat([version, iv, ciphertext, authTag]).toString('base64');
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    
    logger.error('Encryption failed', error as Error, { context });
    throw new EncryptionError('Failed to encrypt data', 'ENCRYPT_FAILED');
  }
}

/**
 * Decrypt a base64-encoded encrypted string
 * 
 * @param encryptedData - Base64-encoded encrypted data
 * @param context - The key context to use
 * @returns Decrypted plaintext
 */
export function decrypt(
  encryptedData: string,
  context: KeyContext = KeyContext.DEFAULT
): string {
  try {
    const masterKey = getMasterKey(context);
    const contextKey = deriveContextKey(masterKey, context);
    
    const buf = Buffer.from(encryptedData, 'base64');
    
    // Check minimum length
    const minLength = 1 + IV_LENGTH + 1 + AUTH_TAG_LENGTH; // version + iv + at least 1 byte + tag
    if (buf.length < minLength) {
      throw new EncryptionError('Invalid encrypted data format', 'INVALID_FORMAT');
    }
    
    // Parse components
    const version = buf[0];
    
    if (version === 0x01) {
      // Version 1 format
      const iv = buf.subarray(1, 1 + IV_LENGTH);
      const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
      const ciphertext = buf.subarray(1 + IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
      
      const decipher = crypto.createDecipheriv(ALGORITHM, contextKey, iv);
      decipher.setAuthTag(authTag);
      
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      
      return plaintext.toString('utf8');
    } else if (version !== undefined && version >= 0x20 && version <= 0x7E) {
      // Legacy format (no version byte, starts with printable ASCII - likely IV)
      // Assume old format: iv(12) + ciphertext + authTag(16)
      const iv = buf.subarray(0, IV_LENGTH);
      const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
      const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
      
      const decipher = crypto.createDecipheriv(ALGORITHM, contextKey, iv);
      decipher.setAuthTag(authTag);
      
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      
      return plaintext.toString('utf8');
    } else {
      throw new EncryptionError(`Unsupported encryption version: ${version}`, 'UNSUPPORTED_VERSION');
    }
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    
    // Don't log the actual data for security
    logger.warn('Decryption failed', { context, errorType: (error as Error).name });
    throw new EncryptionError('Failed to decrypt data', 'DECRYPT_FAILED');
  }
}

/**
 * Legacy encryption function for compatibility with existing data
 * Uses the same format as app/lib/crypto.ts
 */
export function encryptLegacy(plainText: string): string {
  const rawKey = process.env.IDRX_ENC_KEY || process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new EncryptionError('Missing IDRX_ENC_KEY environment variable', 'MISSING_KEY');
  }
  
  const key = normalizeKey(rawKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Legacy format: iv + ciphertext + authTag (no version byte)
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

/**
 * Legacy decryption function for compatibility with existing data
 */
export function decryptLegacy(encryptedData: string): string {
  const rawKey = process.env.IDRX_ENC_KEY || process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new EncryptionError('Missing IDRX_ENC_KEY environment variable', 'MISSING_KEY');
  }
  
  const key = normalizeKey(rawKey);
  const buf = Buffer.from(encryptedData, 'base64');
  
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  return plaintext.toString('utf8');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a secure random key
 * 
 * @param format - Output format
 * @returns Generated key string
 */
export function generateKey(format: 'base64' | 'hex' = 'base64'): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return format === 'hex' ? key.toString('hex') : key.toString('base64');
}

/**
 * Generate a secure random string (for tokens, IDs, etc.)
 * 
 * @param length - Desired length of output string
 * @returns Random string
 */
export function generateSecureToken(length: number = 32): string {
  // Generate more bytes than needed, then encode and trim
  const bytes = Math.ceil(length * 0.75);
  return crypto.randomBytes(bytes).toString('base64url').slice(0, length);
}

/**
 * Hash a value using SHA-256
 * 
 * @param value - Value to hash
 * @param encoding - Output encoding
 * @returns Hashed value
 */
export function hash(value: string, encoding: 'hex' | 'base64' = 'hex'): string {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

/**
 * Hash a value with a salt using HMAC-SHA256
 * 
 * @param value - Value to hash
 * @param salt - Salt for the hash
 * @returns Hashed value
 */
export function hmacHash(value: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(value).digest('hex');
}

/**
 * Compare two strings in constant time to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    // Still compare to maintain constant time even on length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Mask sensitive data for logging (show first/last few characters)
 */
export function maskSensitive(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars * 2) {
    return '****';
  }
  
  return `${value.slice(0, visibleChars)}****${value.slice(-visibleChars)}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  encrypt,
  decrypt,
  encryptLegacy,
  decryptLegacy,
  generateKey,
  generateSecureToken,
  hash,
  hmacHash,
  secureCompare,
  maskSensitive,
  clearKeyCache,
  KeyContext,
  EncryptionError,
};
