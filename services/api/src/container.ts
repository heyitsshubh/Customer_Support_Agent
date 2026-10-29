import { createContainer, asValue, asClass, InjectionMode, AwilixContainer } from 'awilix';
import { getSql } from './infrastructure/database/connection.js';
import { getCacheService, ICacheService } from './infrastructure/cache/RedisCacheService.js';
import { AIAgentClient, IAIAgentClient } from './infrastructure/http/AIAgentClient.js';
import { config } from './config.js';
import { logger, Logger } from './infrastructure/observability/logger.js';
import { ICaseRepository } from './domain/interfaces/ICaseRepository.js';
import { ICustomerRepository } from './domain/interfaces/ICustomerRepository.js';
import { IOrderRepository } from './domain/interfaces/IOrderRepository.js';
import { IRefundRepository } from './domain/interfaces/IRefundRepository.js';
import { IDocumentRepository } from './domain/interfaces/IDocumentRepository.js';
import { PgCaseRepository } from './infrastructure/database/repositories/PgCaseRepository.js';
import { PgCustomerRepository } from './infrastructure/database/repositories/PgCustomerRepository.js';
import { PgOrderRepository } from './infrastructure/database/repositories/PgOrderRepository.js';
import { PgRefundRepository } from './infrastructure/database/repositories/PgRefundRepository.js';
import { PgDocumentRepository } from './infrastructure/database/repositories/PgDocumentRepository.js';

export interface AppDependencies {
  config: typeof config;
  logger: Logger;
  sql: ReturnType<typeof getSql>;
  cacheService: ICacheService;
  aiAgentClient: IAIAgentClient;
  caseRepository: ICaseRepository;
  customerRepository: ICustomerRepository;
  orderRepository: IOrderRepository;
  refundRepository: IRefundRepository;
  documentRepository: IDocumentRepository;
}

export function buildContainer(): AwilixContainer<AppDependencies> {
  const container = createContainer<AppDependencies>({
    injectionMode: InjectionMode.CLASSIC,
  });

  const sql = getSql();

  container.register({
    config: asValue(config),
    logger: asValue(logger),
    sql: asValue(sql),
    cacheService: asValue(getCacheService()),
    aiAgentClient: asValue(new AIAgentClient(config.AI_SERVICE_URL, config.INTERNAL_SERVICE_TOKEN)),
    caseRepository: asValue(new PgCaseRepository(sql)),
    customerRepository: asValue(new PgCustomerRepository(sql)),
    orderRepository: asValue(new PgOrderRepository(sql)),
    refundRepository: asValue(new PgRefundRepository(sql)),
    documentRepository: asValue(new PgDocumentRepository(sql)),
  });

  return container;
}

