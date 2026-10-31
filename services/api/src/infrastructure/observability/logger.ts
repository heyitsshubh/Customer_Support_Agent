import pino from 'pino';
import { config } from '../config.js';

/**
 * Pino logger configured for structured JSON output.
 *
 * In production: JSON lines with redaction of sensitive fields.
 * In development: Pretty-printed with colors.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }
    : {}),
  base: {
    service: config.OTEL_SERVICE_NAME_API,
    env: config.NODE_ENV,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-internal-token"]', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

export type Logger = typeof logger;
