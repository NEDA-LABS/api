/**
 * Utils Index
 * 
 * Centralizes all utility exports.
 */

// Logging
export { logger, httpLogStream } from './logger.js';

// Encryption & Security
export {
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
} from './encryption.js';
