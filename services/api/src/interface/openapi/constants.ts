/**
 * OpenAPI route tags and security decorators for all API modules.
 *
 * This file documents the standard `schema` block patterns to add
 * to each route registration so @fastify/swagger picks them up.
 *
 * Each route plugin already exports its routes. The tags below are applied
 * via the Fastify route `schema.tags` and `schema.security` options.
 *
 * Reference: https://swagger.io/specification/#operation-object
 */

/**
 * Standard security requirement for protected endpoints.
 * Apply to every route that calls fastify.authenticate().
 */
export const BEARER_SECURITY = [{ BearerAuth: [] }];

/**
 * Map of route module → OpenAPI tag name.
 * Used consistently across all route schema definitions.
 */
export const ROUTE_TAGS = {
  health:      ['Health'],
  auth:        ['Auth'],
  chat:        ['Chat'],
  cases:       ['Cases'],
  customers:   ['Customers'],
  orders:      ['Orders'],
  refunds:     ['Refunds'],
  docs:        ['Documents'],
  feedback:    ['Feedback'],
  analytics:   ['Analytics'],
  admin:       ['Admin'],
  experiments: ['Experiments'],
} as const;

/**
 * Reusable OpenAPI response definitions.
 */
export const COMMON_RESPONSES = {
  /** 401 Unauthorized */
  unauthorized: {
    401: {
      description: 'Missing or invalid Bearer token',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UnauthorizedError' },
        },
      },
    },
  },
  /** 403 Forbidden */
  forbidden: {
    403: {
      description: 'Insufficient role permissions',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
  /** 404 Not Found */
  notFound: {
    404: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotFoundError' },
        },
      },
    },
  },
  /** 422 Validation Error */
  validationError: {
    422: {
      description: 'Request body or params failed validation',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
  /** 429 Rate Limit */
  rateLimited: {
    429: {
      description: 'Too many requests — rate limit exceeded',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
  /** 503 Service Unavailable */
  serviceUnavailable: {
    503: {
      description: 'Downstream service (AI agent) unavailable',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
} as const;
