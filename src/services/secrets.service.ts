/**
 * Secrets Service
 * 
 * Manages encrypted storage and retrieval of sensitive credentials.
 * Provides a type-safe interface for handling third-party API credentials,
 * user secrets, and other sensitive data.
 */

import { prisma } from '../repositories/prisma.js';
import {
  encrypt,
  decrypt,
  encryptLegacy,
  decryptLegacy,
  KeyContext,
  EncryptionError,
  maskSensitive,
} from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface EncryptedCredentials {
  apiKeyEnc: string;
  apiSecretEnc: string;
}

export interface DecryptedCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface IDRXCredentials extends DecryptedCredentials {
  idrxId: number;
  userId: string;
}

export interface SecretMetadata {
  provider: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isRotated?: boolean;
  lastUsedAt?: Date;
}

export type SecretProvider = 
  | 'idrx'
  | 'yellowcard'
  | 'cngn'
  | 'paycrest'
  | 'smile_id'
  | 'sumsub';

// =============================================================================
// SECRETS SERVICE CLASS
// =============================================================================

class SecretsService {
  private readonly context = KeyContext.API_CREDENTIALS;

  /**
   * Encrypt API credentials for storage
   */
  encryptCredentials(apiKey: string, apiSecret: string): EncryptedCredentials {
    if (!apiKey) {
      throw new EncryptionError('API key is required', 'MISSING_API_KEY');
    }

    try {
      const apiKeyEnc = encrypt(apiKey, this.context);
      const apiSecretEnc = apiSecret ? encrypt(apiSecret, this.context) : encrypt('', this.context);

      logger.debug('Credentials encrypted', {
        keyPreview: maskSensitive(apiKey, 4),
        hasSecret: !!apiSecret,
      });

      return { apiKeyEnc, apiSecretEnc };
    } catch (error) {
      logger.error('Failed to encrypt credentials', error as Error);
      throw error;
    }
  }

  /**
   * Decrypt stored API credentials
   */
  decryptCredentials(apiKeyEnc: string, apiSecretEnc: string): DecryptedCredentials {
    if (!apiKeyEnc) {
      throw new EncryptionError('Encrypted API key is required', 'MISSING_ENCRYPTED_KEY');
    }

    try {
      const apiKey = decrypt(apiKeyEnc, this.context);
      const apiSecret = apiSecretEnc ? decrypt(apiSecretEnc, this.context) : '';

      return { apiKey, apiSecret };
    } catch (error) {
      // Try legacy decryption for backwards compatibility
      try {
        const apiKey = decryptLegacy(apiKeyEnc);
        const apiSecret = apiSecretEnc ? decryptLegacy(apiSecretEnc) : '';
        
        logger.debug('Used legacy decryption for credentials');
        return { apiKey, apiSecret };
      } catch {
        // Legacy also failed, throw original error
        logger.error('Failed to decrypt credentials', error as Error);
        throw error;
      }
    }
  }

  /**
   * Encrypt credentials using legacy format (for compatibility with existing data)
   */
  encryptCredentialsLegacy(apiKey: string, apiSecret: string): EncryptedCredentials {
    if (!apiKey) {
      throw new EncryptionError('API key is required', 'MISSING_API_KEY');
    }

    const apiKeyEnc = encryptLegacy(apiKey);
    const apiSecretEnc = apiSecret ? encryptLegacy(apiSecret) : encryptLegacy('');

    return { apiKeyEnc, apiSecretEnc };
  }

  // ===========================================================================
  // IDRX CREDENTIALS
  // ===========================================================================

  /**
   * Get IDRX credentials for a user
   */
  async getIDRXCredentials(userId: string): Promise<IDRXCredentials | null> {
    const onboarded = await prisma.idrxOnboarded.findUnique({
      where: { userId },
      select: {
        idrxId: true,
        userId: true,
        apiKeyEnc: true,
        apiSecretEnc: true,
      },
    });

    if (!onboarded) {
      logger.debug('No IDRX credentials found', { userId });
      return null;
    }

    if (!onboarded.apiKeyEnc) {
      logger.warn('IDRX record exists but missing credentials', { userId, idrxId: onboarded.idrxId });
      return null;
    }

    try {
      const { apiKey, apiSecret } = this.decryptCredentials(
        onboarded.apiKeyEnc,
        onboarded.apiSecretEnc || ''
      );

      return {
        idrxId: onboarded.idrxId,
        userId: onboarded.userId,
        apiKey,
        apiSecret,
      };
    } catch (error) {
      logger.error('Failed to decrypt IDRX credentials', error as Error, { userId });
      return null;
    }
  }

  /**
   * Store IDRX credentials for a user
   */
  async storeIDRXCredentials(
    userId: string,
    idrxId: number,
    apiKey: string,
    apiSecret: string
  ): Promise<void> {
    const { apiKeyEnc, apiSecretEnc } = this.encryptCredentialsLegacy(apiKey, apiSecret);

    await prisma.idrxOnboarded.upsert({
      where: { userId },
      update: {
        idrxId,
        apiKeyEnc,
        apiSecretEnc,
        updatedAt: new Date(),
      },
      create: {
        userId,
        idrxId,
        apiKeyEnc,
        apiSecretEnc,
      },
    });

    logger.info('IDRX credentials stored', {
      userId,
      idrxId,
      keyPreview: maskSensitive(apiKey, 4),
    });
  }

  /**
   * Check if user has valid IDRX credentials
   */
  async hasValidIDRXCredentials(userId: string): Promise<boolean> {
    const credentials = await this.getIDRXCredentials(userId);
    return credentials !== null && !!credentials.apiKey;
  }

  // ===========================================================================
  // GENERIC PROVIDER CREDENTIALS (for Yellow Card, cNGN, etc.)
  // ===========================================================================

  /**
   * Get provider-specific credentials from environment
   * Used for providers that use global API keys rather than per-user keys
   */
  getProviderCredentials(provider: SecretProvider): DecryptedCredentials | null {
    const keyMap: Record<SecretProvider, { key: string; secret: string }> = {
      idrx: { key: 'IDRX_API_KEY', secret: 'IDRX_API_SECRET' },
      yellowcard: { key: 'YELLOWCARD_API_KEY', secret: 'YELLOWCARD_SECRET_KEY' },
      cngn: { key: 'KORAPAY_API_KEY', secret: 'KORAPAY_SECRET_KEY' },
      paycrest: { key: 'PAYCREST_API_KEY', secret: 'PAYCREST_SECRET_KEY' },
      smile_id: { key: 'SMILE_ID_PARTNER_ID', secret: 'SMILE_ID_API_KEY' },
      sumsub: { key: 'SUMSUB_APP_TOKEN', secret: 'SUMSUB_SECRET_KEY' },
    };

    const envVars = keyMap[provider];
    if (!envVars) {
      logger.warn('Unknown provider', { provider });
      return null;
    }

    const apiKey = process.env[envVars.key];
    const apiSecret = process.env[envVars.secret];

    if (!apiKey) {
      logger.warn('Missing provider API key', { provider, envVar: envVars.key });
      return null;
    }

    return { apiKey, apiSecret: apiSecret || '' };
  }

  /**
   * Validate that provider credentials are configured
   */
  isProviderConfigured(provider: SecretProvider): boolean {
    const credentials = this.getProviderCredentials(provider);
    return credentials !== null && !!credentials.apiKey;
  }

  // ===========================================================================
  // CREDENTIAL ROTATION
  // ===========================================================================

  /**
   * Rotate IDRX credentials for a user
   * Re-encrypts with new key without changing the actual credentials
   */
  async rotateIDRXCredentials(userId: string): Promise<boolean> {
    const onboarded = await prisma.idrxOnboarded.findUnique({
      where: { userId },
      select: {
        idrxId: true,
        apiKeyEnc: true,
        apiSecretEnc: true,
      },
    });

    if (!onboarded || !onboarded.apiKeyEnc) {
      logger.warn('No credentials to rotate', { userId });
      return false;
    }

    try {
      // Decrypt with current key
      const { apiKey, apiSecret } = this.decryptCredentials(
        onboarded.apiKeyEnc,
        onboarded.apiSecretEnc || ''
      );

      // Re-encrypt with new context key
      const { apiKeyEnc, apiSecretEnc } = this.encryptCredentials(apiKey, apiSecret);

      // Update in database
      await prisma.idrxOnboarded.update({
        where: { userId },
        data: {
          apiKeyEnc,
          apiSecretEnc,
          updatedAt: new Date(),
        },
      });

      logger.info('IDRX credentials rotated', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to rotate credentials', error as Error, { userId });
      return false;
    }
  }

  // ===========================================================================
  // BULK OPERATIONS (for migrations)
  // ===========================================================================

  /**
   * Migrate all IDRX credentials from legacy to new encryption format
   */
  async migrateIDRXCredentials(): Promise<{ migrated: number; failed: number }> {
    const allOnboarded = await prisma.idrxOnboarded.findMany({
      where: {
        apiKeyEnc: { not: '' },
      },
      select: {
        userId: true,
        idrxId: true,
        apiKeyEnc: true,
        apiSecretEnc: true,
      },
    });

    let migrated = 0;
    let failed = 0;

    for (const record of allOnboarded) {
      try {
        if (!record.apiKeyEnc) continue;

        // Attempt legacy decryption
        const { apiKey, apiSecret } = this.decryptCredentials(
          record.apiKeyEnc,
          record.apiSecretEnc || ''
        );

        // Check if already in new format by testing if it decrypts with new format
        try {
          decrypt(record.apiKeyEnc, this.context);
          // Already in new format, skip
          continue;
        } catch {
          // Not in new format, needs migration
        }

        // Re-encrypt with new format
        const { apiKeyEnc, apiSecretEnc } = this.encryptCredentials(apiKey, apiSecret);

        await prisma.idrxOnboarded.update({
          where: { userId: record.userId },
          data: {
            apiKeyEnc,
            apiSecretEnc,
            updatedAt: new Date(),
          },
        });

        migrated++;
        logger.debug('Migrated credentials', { userId: record.userId });
      } catch (error) {
        failed++;
        logger.error('Failed to migrate credentials', error as Error, { userId: record.userId });
      }
    }

    logger.info('Credential migration complete', { migrated, failed, total: allOnboarded.length });
    return { migrated, failed };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const secretsService = new SecretsService();
export default secretsService;
