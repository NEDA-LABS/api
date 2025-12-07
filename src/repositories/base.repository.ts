import { PaginationParams, calculatePagination, PaginationMeta } from '../types/api.js';
import { prisma } from './prisma.js';

/**
 * Base Repository Interface
 * Defines common CRUD operations
 */
export interface IBaseRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<{ data: T[]; pagination: PaginationMeta }>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * Create a paginated query helper
 */
export function createPaginatedQuery<T>(
  model: {
    findMany: (args: { skip: number; take: number; orderBy?: object }) => Promise<T[]>;
    count: () => Promise<number>;
  },
  params: PaginationParams
) {
  return async (): Promise<{ data: T[]; pagination: PaginationMeta }> => {
    const skip = (params.page - 1) * params.limit;
    const take = params.limit;
    
    const orderBy = params.sortBy
      ? { [params.sortBy]: params.sortOrder }
      : { createdAt: 'desc' as const };

    const [data, total] = await Promise.all([
      model.findMany({ skip, take, orderBy }),
      model.count(),
    ]);

    const pagination = calculatePagination(params.page, params.limit, total);

    return { data, pagination };
  };
}

/**
 * Transaction helper for complex operations
 */
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as typeof prisma);
  });
}

export { prisma };
