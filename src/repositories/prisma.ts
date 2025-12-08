import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances during development with hot reloading.
 * Uses connection pooling for production.
 * Prisma 7 requires an adapter for the "client" engine type.
 */

// Extend global to hold prisma instance and pool
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Create PostgreSQL connection pool
 */
function createPool(): Pool {
  return new Pool({
    connectionString: config.database.url,
  });
}

/**
 * Create Prisma client with adapter and logging configuration
 */
function createPrismaClient(pool: Pool): PrismaClient {
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: config.isDev
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

/**
 * Get or create Prisma client instance
 */
const pool = globalForPrisma.pool ?? createPool();
export const prisma = globalForPrisma.prisma ?? createPrismaClient(pool);

// Store instances in global for development (prevents multiple instances during HMR)
if (!config.isProd) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    log.info('✅ Database connected');
  } catch (error) {
    log.error('❌ Database connection failed', error as Error);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  log.info('Database disconnected');
}

/**
 * Health check for database
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
