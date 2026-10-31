import { z } from 'zod';

/**
 * Configuration schema for the API gateway.
 * All environment variables are validated at startup using Zod.
 * If any required variable is missing, the process exits immediately.
 */
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Database
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/support_agent'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Internal service
  INTERNAL_SERVICE_TOKEN: z.string().min(16, 'INTERNAL_SERVICE_TOKEN must be at least 16 chars'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8001'),

  // OpenTelemetry
  OTEL_SERVICE_NAME_API: z.string().default('api-gateway'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Parses and validates environment variables.
 * Throws a descriptive error and exits if validation fails.
 */
function loadConfig(): AppConfig {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

/** Singleton config instance — validated once at startup */
export const config: AppConfig = loadConfig();
