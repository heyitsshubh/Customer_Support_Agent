import Fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { logger } from './infrastructure/observability/logger.js';
import { globalErrorHandler } from './interface/errors/GlobalErrorHandler.js';
import { buildContainer } from './container.js';
import { healthRoutes } from './interface/modules/health/health.routes.js';
import { authPlugin } from './interface/plugins/auth.plugin.js';
import { authRoutes } from './interface/modules/auth/auth.routes.js';
import { chatRoutes } from './interface/modules/chat/chat.routes.js';
import { closeSql } from './infrastructure/database/connection.js';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    disableRequestLogging: false,
    loggerInstance: logger,
  });

  // Global DI Container
  const container = buildContainer();
  app.decorate('container', container);

  // Global Error Handler
  app.setErrorHandler(globalErrorHandler);

  // Register Core Plugins
  await app.register(authPlugin);

  // Register Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(chatRoutes, { prefix: '/api/v1' });



  // Graceful shutdown hook
  app.addHook('onClose', async () => {
    logger.info('Closing server resources...');
    await closeSql();
    await container.cradle.cacheService.delete('temp-lock').catch(() => {});
  });

  return app;
}

export async function startServer(): Promise<void> {
  const server = await createServer();

  try {
    const address = await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
    logger.info(`🚀 Fastify API Gateway running at ${address}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start API Gateway');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
