import { createApp } from './app.js';
import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './repositories/prisma.js';

/**
 * Server entry point
 * 
 * Handles:
 * - Database connection
 * - Server startup
 * - Graceful shutdown
 */

async function main() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Create Express app
    const app = createApp();
    
    // Start server
    const server = app.listen(config.port, config.host, () => {
      log.info(`🚀 Server running on http://${config.host}:${config.port}`);
      log.info(`📚 API version: ${config.apiVersion}`);
      log.info(`🌍 Environment: ${config.env}`);
      log.info(`📊 Health check: http://${config.host}:${config.port}/api/${config.apiVersion}/health`);
    });

    // ==========================================================================
    // Graceful Shutdown
    // ==========================================================================
    
    const shutdown = async (signal: string) => {
      log.info(`\n${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        log.info('HTTP server closed');
        
        // Disconnect from database
        await disconnectDatabase();
        
        log.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        log.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      log.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      log.error('Unhandled rejection', reason as Error);
      shutdown('unhandledRejection');
    });

  } catch (error) {
    log.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Run the server
main();
