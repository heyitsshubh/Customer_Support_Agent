import Redis from 'ioredis';
import { config } from '../../config.js';
import { logger } from '../observability/logger.js';

/**
 * ICacheService defines the interface for caching operations.
 * Follows Interface Segregation — only expose what consumers need.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

/**
 * Redis-backed cache service.
 * Implements ICacheService using ioredis.
 * All values are JSON-serialized for type safety.
 */
export class RedisCacheService implements ICacheService {
  private readonly client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    this.client.on('error', (err) => logger.error({ err }, 'Redis connection error'));
    this.client.on('connect', () => logger.info('Redis connected'));
    this.client.on('reconnecting', () => logger.warn('Redis reconnecting'));
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    logger.info('Redis connection closed');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /** Used by the readiness health check */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

/** Singleton instance */
let _cache: RedisCacheService | null = null;

export function getCacheService(): RedisCacheService {
  if (!_cache) {
    _cache = new RedisCacheService(config.REDIS_URL);
  }
  return _cache;
}
