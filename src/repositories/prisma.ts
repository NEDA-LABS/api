import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances during development with hot reloading.
 * Uses connection pooling for production.
 */

// Extend global to hold prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma client with logging configuration
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: config.isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });
}

/**
 * Get or create Prisma client instance
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Log queries in development
if (config.isDev) {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    log.db('query', e.query, { duration: `${e.duration}ms` });
  });
}

// Log errors
prisma.$on('error' as never, (e: { message: string }) => {
  log.error('Prisma error', new Error(e.message));
});

// Store instance in global for development
if (!config.isProd) {
  globalForPrisma.prisma = prisma;
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
