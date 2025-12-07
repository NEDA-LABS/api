import { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError, ConflictError } from '../errors/index.js';
import { PaginationParams, PaginationMeta } from '../types/api.js';
import { log } from '../utils/logger.js';

/**
 * User Service
 * 
 * Business logic layer for user operations.
 * Orchestrates repository calls and applies business rules.
 */
export const userService = {
  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    
    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }
    
    return user;
  },

  /**
   * Get user by Privy user ID
   */
  async getUserByPrivyId(privyUserId: string): Promise<User> {
    const user = await userRepository.findByPrivyUserId(privyUserId);
    
    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }
    
    return user;
  },

  /**
   * Get all users with pagination
   */
  async getUsers(params: PaginationParams): Promise<{
    data: User[];
    pagination: PaginationMeta;
  }> {
    return userRepository.findAll(params);
  },

  /**
   * Create or update user from Privy authentication
   */
  async syncFromPrivy(privyUserId: string, data: {
    email?: string | null;
    wallet?: string | null;
    name?: string | null;
  }): Promise<User> {
    const existing = await userRepository.findByPrivyUserId(privyUserId);
    
    if (existing) {
      // Update existing user
      const updateData: Partial<typeof data> = {};
      
      if (data.email && data.email !== existing.email) {
        updateData.email = data.email;
      }
      if (data.wallet && data.wallet !== existing.wallet) {
        updateData.wallet = data.wallet;
      }
      if (data.name && data.name !== existing.name) {
        updateData.name = data.name;
      }
      
      if (Object.keys(updateData).length > 0) {
        log.info('Updating user from Privy', { privyUserId, updates: Object.keys(updateData) });
        return userRepository.updateByPrivyUserId(privyUserId, updateData);
      }
      
      return existing;
    }
    
    // Check for conflicts
    if (data.email) {
      const emailExists = await userRepository.findByEmail(data.email);
      if (emailExists) {
        throw new ConflictError(`Email ${data.email} is already registered`);
      }
    }
    
    if (data.wallet) {
      const walletExists = await userRepository.findByWallet(data.wallet);
      if (walletExists) {
        throw new ConflictError(`Wallet ${data.wallet} is already registered`);
      }
    }
    
    // Create new user
    log.info('Creating new user from Privy', { privyUserId });
    return userRepository.create({
      privyUserId,
      email: data.email,
      wallet: data.wallet,
      name: data.name,
    });
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: {
    name?: string;
    profileDisplayName?: string;
  }): Promise<User> {
    // Verify user exists
    await this.getUserById(userId);
    
    return userRepository.update(userId, data);
  },

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<User> {
    // Verify user exists
    await this.getUserById(userId);
    
    log.warn('Deactivating user account', { userId });
    return userRepository.update(userId, { isActive: false });
  },

  /**
   * Reactivate user account
   */
  async reactivateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    if (user.isActive) {
      return user; // Already active
    }
    
    log.info('Reactivating user account', { userId });
    return userRepository.update(userId, { isActive: true });
  },
};

export type UserService = typeof userService;
