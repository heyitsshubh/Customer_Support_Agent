/**
 * Redoc API documentation route.
 *
 * Serves the Redoc HTML portal at GET /api/redoc
 * Redoc fetches the spec from /api/docs/json (served by @fastify/swagger).
 *
 * No authentication required — docs are public.
 */

import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const redocHtml = readFileSync(
  resolve(process.cwd(), 'public', 'redoc.html'),
  'utf-8',
);

export async function redocRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/redoc',
    {
      schema: {
        hide: true, // exclude from the OpenAPI spec itself
      },
    },
    async (_req, reply) => {
      reply.type('text/html').send(redocHtml);
    },
  );
}
