import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainErrors.js';
import { logger } from '../../infrastructure/observability/logger.js';

/**
 * Global centralized error handler for Fastify.
 * Maps domain errors, validation errors, and unexpected exceptions to uniform HTTP error payloads.
 */
export function globalErrorHandler(
  error: FastifyError | DomainError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const reqId = request.id;

  // 1. Domain errors (Business rule violations, e.g. 404, 401, 403, 422, 503)
  if (error instanceof DomainError) {
    logger.warn({ reqId, errCode: error.code, message: error.message }, 'Domain error handled');
    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId: reqId,
      },
    });
    return;
  }

  // 2. Fastify schema validation errors
  if ('validation' in error && error.validation) {
    logger.warn({ reqId, validation: error.validation }, 'Validation error handled');
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: error.validation,
        requestId: reqId,
      },
    });
    return;
  }

  // 3. Fastify specific HTTP errors (e.g. 429 rate limit, 404 route not found)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    logger.warn({ reqId, statusCode: error.statusCode, message: error.message }, 'Fastify HTTP error handled');
    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || 'HTTP_ERROR',
        message: error.message,
        requestId: reqId,
      },
    });
    return;
  }

  // 4. Uncaught internal server errors (500) - Never leak sensitive stack traces to client
  logger.error({ reqId, err: error }, 'Unhandled internal server error');
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
      requestId: reqId,
    },
  });
}
