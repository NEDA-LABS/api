/**
 * IDRX Member Sync Service
 * 
 * Synchronizes IDRX members with local database.
 * Follows principles:
 * - Single Responsibility: Only handles member synchronization
 * - Idempotency: Safe to run multiple times
 * - Batch Processing: Efficient database operations
 * - Error Recovery: Continues on individual failures
 * - Logging: Comprehensive audit trail
 */

import { prisma } from '../../../repositories/prisma.js';
import { idrxService } from './service.js';
import { encrypt, KeyContext } from '../../../utils/encryption.js';
import { logger } from '../../../utils/logger.js';
import { 
  IDRXMember, 
  SyncResult, 
  SyncOptions 
} from './types.js';

export class IdrxSyncService {
  /**
   * Fetches all members from IDRX API
   */
  private async fetchIDRXMembers(): Promise<IDRXMember[]> {
    return idrxService.request<IDRXMember[]>('GET', '/api/auth/members')
      .then((data: any) => data.data || [])
      .catch(error => {
        logger.error('Failed to fetch IDRX members', error as Error);
        throw error;
      });
  }

  /**
   * Finds or creates user by email
   * Creates a basic user record for IDRX members without local accounts
   */
  private async findOrCreateUser(email: string, fullname: string, idrxId: number): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Try to find existing user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (user) {
      return user.id;
    }

    // User doesn't exist - create a basic user record for IDRX member
    // Use a synthetic privyUserId based on IDRX ID
    const syntheticPrivyId = `idrx-${idrxId}`;
    
    logger.info(`Creating user for IDRX member ${idrxId} (${email})`);
    
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        privyUserId: syntheticPrivyId,
        name: fullname,
        isActive: true,
      },
    });

    return newUser.id;
  }

  /**
   * Syncs a single member to database
   */
  private async syncMember(
    member: IDRXMember,
    options: SyncOptions
  ): Promise<'created' | 'updated' | 'skipped'> {
    const { dryRun = false, skipEncryption = false } = options;
    const normalizedEmail = member.email.toLowerCase().trim();

    // Check if user with this email already has an IDRX onboarding record
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { 
        idrxOnboarded: true,
      },
    });

    if (existingUser?.idrxOnboarded) {
      // User already has IDRX onboarding record
      // Check if it's the same IDRX member or different
      if (existingUser.idrxOnboarded.idrxId !== member.id) {
        // Different IDRX ID for same email - this is a conflict
        logger.warn(`Email ${member.email} already linked to IDRX ID ${existingUser.idrxOnboarded.idrxId}, cannot link to ${member.id}`);
        return 'skipped';
      }
      
      // Same member exists - check if we need to update API keys
      const hasApiKeys = member.ApiKeys && member.ApiKeys.length > 0;
      const currentHasKeys = existingUser.idrxOnboarded.apiKeyEnc && existingUser.idrxOnboarded.apiKeyEnc !== '';
      
      // If member has API keys but our record doesn't, or if we should update them
      if (hasApiKeys && member.ApiKeys && (!currentHasKeys || !skipEncryption)) {
        const firstKey = member.ApiKeys[0]!;
        
        // Validate that we have both API key and secret
        if (!firstKey.apiKey) {
          logger.error(`Member ${member.id} (${member.email}) has no API key - SKIPPING`);
          return 'skipped';
        }

        if (!firstKey.apiSecret) {
          logger.error(`Member ${member.id} (${member.email}) has no API secret - SKIPPING`);
          return 'skipped';
        }
        
        try {
          const apiKeyEnc = encrypt(firstKey.apiKey, KeyContext.API_CREDENTIALS);
          const apiSecretEnc = encrypt(firstKey.apiSecret, KeyContext.API_CREDENTIALS);
          
          if (dryRun) {
            logger.info(`[DRY RUN] Would update API keys for member ${member.id}`);
            return 'updated';
          }
          
          // Update the existing record with API keys
          await prisma.idrxOnboarded.update({
            where: { userId: existingUser.id },
            data: {
              apiKeyEnc,
              apiSecretEnc,
              updatedAt: new Date(),
            },
          });
          
          logger.info(`Updated API keys for member ${member.id} (${member.email})`);
          return 'updated';
        } catch (error) {
          logger.warn(`Failed to encrypt/update credentials for member ${member.id}:`, error as Error);
          return 'skipped';
        }
      }
      
      // Already synced and no updates needed
      return 'skipped';
    }

    // Find or create user (will reuse existing user if found by email)
    const userId = await this.findOrCreateUser(member.email, member.fullname, member.id);

    if (dryRun) {
      logger.info(`[DRY RUN] Would sync member ${member.id} for user ${userId}`);
      return 'created';
    }

    // Extract and validate API credentials from ApiKeys array
    let apiKeyEnc: string | null = null;
    let apiSecretEnc: string | null = null;

    if (!skipEncryption && member.ApiKeys && member.ApiKeys.length > 0) {
      const firstKey = member.ApiKeys[0]!;
      
      // Validate that we have both API key and secret
      if (!firstKey.apiKey) {
        logger.error(`Member ${member.id} (${member.email}) has no API key - SKIPPING`);
        return 'skipped';
      }

      if (!firstKey.apiSecret) {
        logger.error(`Member ${member.id} (${member.email}) has no API secret - SKIPPING`);
        return 'skipped';
      }
      
      try {
        apiKeyEnc = encrypt(firstKey.apiKey, KeyContext.API_CREDENTIALS);
        apiSecretEnc = encrypt(firstKey.apiSecret, KeyContext.API_CREDENTIALS);
      } catch (error) {
        logger.error(`Failed to encrypt credentials for member ${member.id}:`, error as Error);
        return 'skipped';
      }
    } else if (!skipEncryption) {
      logger.error(`Member ${member.id} (${member.email}) has no API keys in response - SKIPPING`);
      return 'skipped';
    }

    // Only create IdrxOnboarded record if we have valid credentials
    if (!apiKeyEnc || !apiSecretEnc) {
      logger.error(`Cannot create IDRX record for member ${member.id} without valid credentials`);
      return 'skipped';
    }

    // Create IdrxOnboarded record with validated credentials
    await prisma.idrxOnboarded.create({
      data: {
        userId,
        idrxId: member.id,
        provider: 'idrxco',
        apiKeyEnc,
        apiSecretEnc,
        createdAt: new Date(member.createdAt),
        updatedAt: member.updatedAt ? new Date(member.updatedAt) : new Date(member.createdAt),
      },
    });

    // Update user's name if not set
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: member.fullname,
        updatedAt: new Date(),
      },
    });

    return 'created';
  }

  /**
   * Syncs all IDRX members to local database
   */
  public async syncMembers(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const { batchSize = 10 } = options;

    const result: SyncResult = {
      success: false,
      totalFetched: 0,
      newMembers: 0,
      updatedMembers: 0,
      skippedMembers: 0,
      errors: [],
      duration: 0,
    };

    try {
      logger.info('Starting IDRX member sync...');

      // Fetch all members from IDRX
      const members = await this.fetchIDRXMembers();
      result.totalFetched = members.length;

      logger.info(`Fetched ${members.length} members from IDRX`);

      if (members.length === 0) {
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Process members in batches
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        
        logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(members.length / batchSize)}...`);

        // Process batch members in parallel
        const batchResults = await Promise.allSettled(
          batch.map(member => this.syncMember(member, options))
        );

        // Aggregate results
        batchResults.forEach((promiseResult, index) => {
          const member = batch[index];
        if (!member) return; // Should not happen but safety first
          
          if (promiseResult.status === 'fulfilled') {
            const syncStatus = promiseResult.value;
            
            if (syncStatus === 'created') {
              result.newMembers++;
            } else if (syncStatus === 'updated') {
              result.updatedMembers++;
            } else {
              result.skippedMembers++;
            }
          } else {
            result.errors.push({
              memberId: member.id,
              error: (promiseResult.reason as Error)?.message || 'Unknown error',
            });
            logger.error(`Failed to sync member ${member.id}:`, promiseResult.reason as Error);
          }
        });
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      logger.info('IDRX Sync Completed', result);

      return result;
    } catch (error) {
      logger.error('Sync failed:', error as Error);
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push({
        memberId: 0,
        error: (error as Error).message || 'Unknown error',
      });
      return result;
    }
  }

  /**
   * Validates sync configuration
   */
  public validateOptions(options: SyncOptions): string[] {
    const errors: string[] = [];

    if (options.batchSize !== undefined) {
      if (options.batchSize < 1) {
        errors.push('batchSize must be at least 1');
      }
      if (options.batchSize > 100) {
        errors.push('batchSize should not exceed 100 for optimal performance');
      }
    }

    return errors;
  }
}

export const idrxSyncService = new IdrxSyncService();
