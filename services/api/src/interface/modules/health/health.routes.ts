import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { checkDatabaseHealth } from '../../../infrastructure/database/connection.js';
import { getCacheService } from '../../../infrastructure/cache/RedisCacheService.js';
import { metricsRegistry } from '../../../infrastructure/observability/metrics.js';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Liveness probe
  fastify.get('/health', async (_req, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe: checks Postgres and Redis
  fastify.get('/health/ready', async (_req, reply) => {
    const isDbHealthy = await checkDatabaseHealth();
    const isCacheHealthy = await getCacheService().ping();

    const isReady = isDbHealthy && isCacheHealthy;

    const responsePayload = {
      status: isReady ? 'ready' : 'unhealthy',
      dependencies: {
        database: isDbHealthy ? 'up' : 'down',
        redis: isCacheHealthy ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };

    return reply.status(isReady ? 200 : 503).send(responsePayload);
  });

  // Prometheus metrics scraping endpoint
  fastify.get('/metrics', async (_req, reply) => {
    const metrics = await metricsRegistry.registry.metrics();
    return reply
      .header('Content-Type', metricsRegistry.registry.contentType)
      .send(metrics);
  });
};
