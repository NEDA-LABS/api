import { User, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { PaginationParams, calculatePagination, PaginationMeta } from '../types/api.js';

/**
 * User Repository
 * 
 * Data access layer for User entity.
 * All database queries for users go through this repository.
 */
export const userRepository = {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  /**
   * Find user by Privy user ID
   */
  async findByPrivyUserId(privyUserId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { privyUserId },
    });
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Find user by wallet address
   */
  async findByWallet(wallet: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });
  },

  /**
   * Find all users with pagination
   */
  async findAll(params: PaginationParams): Promise<{
    data: User[];
    pagination: PaginationMeta;
  }> {
    const skip = (params.page - 1) * params.limit;
    const take = params.limit;
    
    const orderBy: Prisma.UserOrderByWithRelationInput = params.sortBy
      ? { [params.sortBy]: params.sortOrder }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy,
      }),
      prisma.user.count(),
    ]);

    return {
      data,
      pagination: calculatePagination(params.page, params.limit, total),
    };
  },

  /**
   * Create a new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        wallet: data.wallet?.toLowerCase(),
      },
    });
  },

  /**
   * Update user by ID
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        wallet: typeof data.wallet === 'string' ? data.wallet.toLowerCase() : data.wallet,
      },
    });
  },

  /**
   * Update user by Privy user ID
   */
  async updateByPrivyUserId(
    privyUserId: string,
    data: Prisma.UserUpdateInput
  ): Promise<User> {
    return prisma.user.update({
      where: { privyUserId },
      data,
    });
  },

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  },

  /**
   * Find or create user by Privy user ID
   */
  async findOrCreate(
    privyUserId: string,
    createData: Omit<Prisma.UserCreateInput, 'privyUserId'>
  ): Promise<User> {
    const existing = await this.findByPrivyUserId(privyUserId);
    
    if (existing) {
      return existing;
    }

    return this.create({
      ...createData,
      privyUserId,
    });
  },

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string, adminWallets: string[]): Promise<boolean> {
    const user = await this.findById(userId);
    
    if (!user?.wallet) {
      return false;
    }

    return adminWallets.some(
      (admin) => admin.toLowerCase() === user.wallet?.toLowerCase()
    );
  },

  /**
   * Get user with relations
   */
  async findByIdWithRelations(
    id: string,
    include: Prisma.UserInclude
  ): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include,
    });
  },
};

export type UserRepository = typeof userRepository;
