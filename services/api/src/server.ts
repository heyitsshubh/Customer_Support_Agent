import Fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { logger } from './infrastructure/observability/logger.js';
import { globalErrorHandler } from './interface/errors/GlobalErrorHandler.js';
import { buildContainer } from './container.js';
import { healthRoutes } from './interface/modules/health/health.routes.js';
import swaggerPlugin from './interface/plugins/swagger.plugin.js';
import { authPlugin } from './interface/plugins/auth.plugin.js';
import { authRoutes } from './interface/modules/auth/auth.routes.js';
import { chatRoutes } from './interface/modules/chat/chat.routes.js';
import { casesRoutes } from './interface/modules/cases/cases.routes.js';
import { customersRoutes } from './interface/modules/customers/customers.routes.js';
import { ordersRoutes } from './interface/modules/orders/orders.routes.js';
import { refundsRoutes } from './interface/modules/refunds/refunds.routes.js';
import { docsRoutes } from './interface/modules/docs/docs.routes.js';
import { redocRoutes } from './interface/modules/docs/redoc.routes.js';
import { feedbackRoutes } from './interface/modules/feedback/feedback.routes.js';
import { analyticsRoutes } from './interface/modules/analytics/analytics.routes.js';
import { adminRoutes } from './interface/modules/admin/admin.routes.js';
import { experimentsRoutes } from './interface/modules/experiments/experiments.routes.js';
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
  await app.register(swaggerPlugin); // ← must be FIRST so all route schemas are captured
  await app.register(authPlugin);

  // Register Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(chatRoutes, { prefix: '/api/v1' });
  await app.register(casesRoutes, { prefix: '/api/v1' });
  await app.register(customersRoutes, { prefix: '/api/v1' });
  await app.register(ordersRoutes, { prefix: '/api/v1' });
  await app.register(refundsRoutes, { prefix: '/api/v1' });
  await app.register(docsRoutes, { prefix: '/api/v1' });
  await app.register(feedbackRoutes, { prefix: '/api/v1' });
  await app.register(analyticsRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });
  await app.register(experimentsRoutes, { prefix: '/api/v1' });
  await app.register(redocRoutes);      // serves GET /api/redoc (Redoc portal, no prefix)








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
    logger.info(`📖 Swagger UI  → ${address}/api/docs`);
    logger.info(`📚 Redoc Docs  → ${address}/api/redoc`);
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
