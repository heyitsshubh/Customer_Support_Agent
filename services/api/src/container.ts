import { createContainer, asValue, asClass, InjectionMode, AwilixContainer } from 'awilix';
import { getSql } from './infrastructure/database/connection.js';
import { getCacheService, ICacheService } from './infrastructure/cache/RedisCacheService.js';
import { AIAgentClient, IAIAgentClient } from './infrastructure/http/AIAgentClient.js';
import { config } from './config.js';
import { logger, Logger } from './infrastructure/observability/logger.js';

export interface AppDependencies {
  config: typeof config;
  logger: Logger;
  sql: ReturnType<typeof getSql>;
  cacheService: ICacheService;
  aiAgentClient: IAIAgentClient;
}

export function buildContainer(): AwilixContainer<AppDependencies> {
  const container = createContainer<AppDependencies>({
    injectionMode: InjectionMode.CLASSIC,
  });

  container.register({
    config: asValue(config),
    logger: asValue(logger),
    sql: asValue(getSql()),
    cacheService: asValue(getCacheService()),
    aiAgentClient: asValue(new AIAgentClient(config.AI_SERVICE_URL, config.INTERNAL_SERVICE_TOKEN)),
  });

  return container;
}
