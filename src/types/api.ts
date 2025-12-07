/**
 * Standard API response types
 * Ensures consistent response format across all endpoints
 */

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata in response
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standard success response
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
    fields?: Record<string, string[]>;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Paginated response helper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    pagination: PaginationMeta;
  };
}

/**
 * Create standard success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: ApiResponse<T>['meta']
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      pagination,
    },
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Parse pagination from query params
 */
export function parsePaginationQuery(query: {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}): PaginationParams {
  return {
    page: Math.max(1, parseInt(query.page || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(query.limit || '20', 10))),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc',
  };
}
