/**
 * Services Index
 * 
 * Centralizes all service exports for clean imports.
 */

// User Management
export { userService } from './user.service.js';

// Secrets & Encryption
export { secretsService } from './secrets.service.js';
export type {
  EncryptedCredentials,
  DecryptedCredentials,
  IDRXCredentials,
  SecretMetadata,
  SecretProvider,
} from './secrets.service.js';

// API Key Management
export { apiKeyService } from './apikey.service.js';
export type {
  ApiKeyData,
  ApiKeyCreateInput,
  ApiKeyCreateResult,
  ValidatedApiKey,
  ApiKeyInfo,
} from './apikey.service.js';

// Ramp Services (On/Off-ramp providers)
export * from './ramp/index.js';

// Email Services
export * from './email/index.js';
