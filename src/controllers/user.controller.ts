import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { createSuccessResponse, createPaginatedResponse, parsePaginationQuery } from '../types/api.js';

/**
 * User Controller
 * 
 * HTTP request handlers for user endpoints.
 * Thin layer that delegates to service layer.
 */
export const userController = {
  /**
   * GET /users
   * Get all users with pagination
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    const pagination = parsePaginationQuery(req.query as Record<string, string>);
    const result = await userService.getUsers(pagination);
    
    res.json(createPaginatedResponse(result.data, result.pagination));
  },

  /**
   * GET /users/:id
   * Get user by ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserById(req.params.id!);
    res.json(createSuccessResponse(user));
  },

  /**
   * GET /users/me
   * Get current authenticated user
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserByPrivyId(req.user!.privyUserId);
    res.json(createSuccessResponse(user));
  },

  /**
   * PUT /users/me
   * Update current user's profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserByPrivyId(req.user!.privyUserId);
    const updated = await userService.updateProfile(user.id, req.body);
    res.json(createSuccessResponse(updated, 'Profile updated successfully'));
  },

  /**
   * POST /users/sync
   * Sync user from Privy (internal/webhook use)
   */
  async syncFromPrivy(req: Request, res: Response): Promise<void> {
    const { privyUserId, email, wallet, name } = req.body;
    const user = await userService.syncFromPrivy(privyUserId, { email, wallet, name });
    res.status(201).json(createSuccessResponse(user, 'User synced successfully'));
  },

  /**
   * POST /users/:id/deactivate
   * Deactivate user account (admin only)
   */
  async deactivateUser(req: Request, res: Response): Promise<void> {
    const user = await userService.deactivateUser(req.params.id!);
    res.json(createSuccessResponse(user, 'User deactivated'));
  },

  /**
   * POST /users/:id/reactivate
   * Reactivate user account (admin only)
   */
  async reactivateUser(req: Request, res: Response): Promise<void> {
    const user = await userService.reactivateUser(req.params.id!);
    res.json(createSuccessResponse(user, 'User reactivated'));
  },
};

export type UserController = typeof userController;
