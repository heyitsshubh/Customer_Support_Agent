import postgres from 'postgres';
import { config } from '../../config.js';
import { logger } from './logger.js';

/**
 * PostgreSQL connection pool using postgres.js.
 * The pool is shared across the entire application.
 * Lazy-initialized on first use.
 */
let _sql: postgres.Sql | null = null;

/**
 * Returns the singleton postgres.js connection pool.
 * Creates it on first call.
 */
export function getSql(): postgres.Sql {
  if (!_sql) {
    _sql = postgres(config.DATABASE_URL, {
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: (msg) => logger.debug({ msg }, 'Postgres notice'),
      debug: config.NODE_ENV === 'development'
        ? (conn, query, params) => logger.trace({ query, params }, 'SQL query')
        : undefined,
    });
  }
  return _sql;
}

/**
 * Closes the database connection pool.
 * Called during graceful shutdown.
 */
export async function closeSql(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
    logger.info('Database connection pool closed');
  }
}

/**
 * Verifies database connectivity.
 * Used in the readiness health check.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    return false;
  }
}
