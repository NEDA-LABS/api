/**
 * Paycrest Transaction Service
 * 
 * Handles retrieval and querying of Paycrest (off-ramp) transactions.
 * Separates transaction data access logic from external API interactions.
 * 
 * Design Principles:
 * - Single Responsibility: Only handles transaction data retrieval
 * - Dependency Injection: Uses Prisma client passed or imported
 * - Interface Segregation: Exposes only necessary methods
 */

import { prisma } from '../../repositories/prisma.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface PaycrestTransactionFilters {
  wallet?: string;           // merchantId (wallet address)
  status?: string;
  currency?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaycrestTransaction {
  id: string;
  createdAt: Date;
  merchantId: string;
  status: string;
  amount: string;
  rate: string;
  currency: string;
  accountName: string;
  accountNumber: string;
  institution: string;
}

export interface PaycrestTransactionSummary {
  totalTransactions: number;
  totalVolume: number;
  byStatus: Record<string, number>;
  byCurrency: Record<string, { count: number; volume: number }>;
}

export interface PaycrestTransactionsResult {
  transactions: PaycrestTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary?: PaycrestTransactionSummary;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

class PaycrestTransactionService {
  
  /**
   * Retrieve Paycrest transactions by wallet address with filtering and pagination
   * 
   * @param filters - Filter criteria (wallet, status, currency, date range)
   * @param pagination - Pagination options (page, pageSize)
   * @param includeSummary - Whether to include summary statistics
   * @returns Paginated transactions with optional summary
   */
  async getTransactionsByWallet(
    filters: PaycrestTransactionFilters,
    pagination: PaginationOptions = {},
    includeSummary: boolean = false
  ): Promise<PaycrestTransactionsResult> {
    const { wallet, status, currency, startDate, endDate } = filters;
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.min(100, Math.max(1, pagination.pageSize || 20));
    const skip = (page - 1) * pageSize;

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    
    if (wallet) {
      // Case-insensitive wallet address match
      whereClause.merchantId = { equals: wallet, mode: 'insensitive' };
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (currency) {
      whereClause.currency = { equals: currency, mode: 'insensitive' };
    }
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (whereClause.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Execute queries in parallel for performance
    const [transactions, totalCount] = await Promise.all([
      prisma.offRampTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.offRampTransaction.count({ where: whereClause }),
    ]);

    const result: PaycrestTransactionsResult = {
      transactions: transactions as PaycrestTransaction[],
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };

    // Include summary if requested
    if (includeSummary && wallet) {
      result.summary = await this.getTransactionSummary(wallet);
    }

    logger.debug('Paycrest transactions retrieved', {
      wallet,
      filters,
      count: transactions.length,
      totalCount,
    });

    return result;
  }

  /**
   * Get a single transaction by ID
   * 
   * @param transactionId - The transaction ID
   * @param wallet - Optional wallet address for ownership verification
   * @returns Transaction or null
   */
  async getTransactionById(
    transactionId: string,
    wallet?: string
  ): Promise<PaycrestTransaction | null> {
    const whereClause: Record<string, unknown> = { id: transactionId };
    
    if (wallet) {
      whereClause.merchantId = { equals: wallet, mode: 'insensitive' };
    }

    const transaction = await prisma.offRampTransaction.findFirst({
      where: whereClause,
    });

    return transaction as PaycrestTransaction | null;
  }

  /**
   * Get transaction summary/statistics for a wallet
   * 
   * @param wallet - Wallet address (merchantId)
   * @returns Summary statistics
   */
  async getTransactionSummary(wallet: string): Promise<PaycrestTransactionSummary> {
    const transactions = await prisma.offRampTransaction.findMany({
      where: { merchantId: { equals: wallet, mode: 'insensitive' } },
      select: {
        status: true,
        amount: true,
        currency: true,
      },
    });

    const summary: PaycrestTransactionSummary = {
      totalTransactions: transactions.length,
      totalVolume: 0,
      byStatus: {},
      byCurrency: {},
    };

    for (const tx of transactions) {
      // Parse amount (stored as string)
      const amount = parseFloat(tx.amount) || 0;
      
      // Aggregate total volume
      summary.totalVolume += amount;
      
      // Aggregate by status
      summary.byStatus[tx.status] = (summary.byStatus[tx.status] || 0) + 1;
      
      // Aggregate by currency
      const currencyKey = tx.currency || 'UNKNOWN';
      if (!summary.byCurrency[currencyKey]) {
        summary.byCurrency[currencyKey] = { count: 0, volume: 0 };
      }
      const currencyStats = summary.byCurrency[currencyKey];
      currencyStats.count += 1;
      currencyStats.volume += amount;
    }

    return summary;
  }

  /**
   * Check if a wallet has any Paycrest transactions
   * 
   * @param wallet - Wallet address
   * @returns Boolean indicating if wallet has transactions
   */
  async walletHasTransactions(wallet: string): Promise<boolean> {
    const count = await prisma.offRampTransaction.count({
      where: { merchantId: { equals: wallet, mode: 'insensitive' } },
      take: 1,
    });
    return count > 0;
  }
}

// Export singleton instance
export const paycrestTransactionService = new PaycrestTransactionService();
