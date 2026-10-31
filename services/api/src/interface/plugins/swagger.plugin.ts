/**
 * Fastify Swagger / OpenAPI 3.1 plugin.
 *
 * Registers:
 *  - @fastify/swagger   → generates /api/docs/json and /api/docs/yaml
 *  - @fastify/swagger-ui → serves interactive Swagger UI at /api/docs
 *
 * This plugin MUST be registered BEFORE any route plugins so that
 * route schemas are picked up automatically.
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

async function swaggerPlugin(app: FastifyInstance): Promise<void> {
  // ─── OpenAPI specification ────────────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Customer Support Agent API',
        description: `
## Overview
Production-grade **AI-powered customer support system** built with:
- **Fastify** API Gateway (TypeScript)
- **LangGraph** multi-step reasoning agent (Python / FastAPI)
- **pgvector** RAG knowledge base
- **Human-in-the-loop** refund approval workflow

## Authentication
All protected endpoints require a **Bearer JWT** token.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Obtain a token via \`POST /api/v1/auth/login\`.
Refresh via \`POST /api/v1/auth/refresh\`.

## Rate Limiting
- **100 requests / minute** per IP (global)
- **10 requests / minute** on auth endpoints

## Roles
| Role       | Access Level |
|------------|-------------|
| \`customer\` | Own data + chat |
| \`agent\`    | All cases + approve refunds |
| \`reviewer\` | Approve/reject pending approvals |
| \`admin\`    | Full access including user management |
        `.trim(),
        version: '1.0.0',
        contact: {
          name: 'Engineering Team',
          email: 'engineering@support-agent.dev',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      externalDocs: {
        description: 'GitHub Repository',
        url: 'https://github.com/heyitsshubh/Customer_Support_Agent',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
        {
          url: 'https://api.support-agent.dev',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token obtained from POST /api/v1/auth/login',
          },
        },
        schemas: {
          // ── Shared error schemas ─────────────────────────────────────────
          ErrorResponse: {
            type: 'object',
            required: ['error', 'message', 'statusCode'],
            properties: {
              statusCode: { type: 'integer', example: 400 },
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'Validation error' },
              requestId: { type: 'string', format: 'uuid' },
            },
          },
          NotFoundError: {
            type: 'object',
            required: ['error', 'message', 'statusCode'],
            properties: {
              statusCode: { type: 'integer', example: 404 },
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'Resource not found' },
            },
          },
          UnauthorizedError: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer', example: 401 },
              error: { type: 'string', example: 'Unauthorized' },
              message: { type: 'string', example: 'Invalid or expired token' },
            },
          },
          // ── Domain schemas ───────────────────────────────────────────────
          Money: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0, example: 89.99 },
              currency: { type: 'string', minLength: 3, maxLength: 3, example: 'USD' },
            },
          },
          CustomerTier: {
            type: 'string',
            enum: ['standard', 'premium', 'enterprise'],
          },
          CaseStatus: {
            type: 'string',
            enum: ['open', 'in_progress', 'pending_approval', 'escalated', 'resolved', 'closed'],
          },
          CasePriority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          RefundStatus: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'executed', 'failed'],
          },
          // ── Entities ────────────────────────────────────────────────────
          Customer: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: 'Alice Johnson' },
              email: { type: 'string', format: 'email' },
              tier: { $ref: '#/components/schemas/CustomerTier' },
              totalOrders: { type: 'integer' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'ORD-1042' },
              customerId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
              totalAmount: { $ref: '#/components/schemas/Money' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Transaction: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              orderId: { type: 'string' },
              amount: { $ref: '#/components/schemas/Money' },
              type: { type: 'string', enum: ['charge', 'refund', 'adjustment'] },
              description: { type: 'string' },
              isDuplicate: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          SupportCase: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              customerId: { type: 'string', format: 'uuid' },
              subject: { type: 'string' },
              status: { $ref: '#/components/schemas/CaseStatus' },
              priority: { $ref: '#/components/schemas/CasePriority' },
              assignedAgentId: { type: 'string', nullable: true },
              resolutionNote: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          RefundRequest: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              caseId: { type: 'string', format: 'uuid' },
              customerId: { type: 'string', format: 'uuid' },
              amount: { $ref: '#/components/schemas/Money' },
              reason: { type: 'string' },
              status: { $ref: '#/components/schemas/RefundStatus' },
              approvedById: { type: 'string', nullable: true },
              approvalNotes: { type: 'string', nullable: true },
              rejectionReason: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          // ── Chat / Agent ─────────────────────────────────────────────────
          ChatMessage: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant', 'system'] },
              content: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          PendingAction: {
            type: 'object',
            nullable: true,
            properties: {
              action: { type: 'string', example: 'request_refund' },
              actionParams: {
                type: 'object',
                properties: {
                  orderId: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
              description: { type: 'string', example: 'Refund $89.99 for duplicate charge on ORD-1042' },
            },
          },
          // ── Auth ─────────────────────────────────────────────────────────
          TokenPair: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'integer', example: 900 },
            },
          },
          // ── Pagination ───────────────────────────────────────────────────
          PaginationMeta: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Liveness and readiness probes, Prometheus metrics' },
        { name: 'Auth', description: 'Registration, login, token refresh, logout' },
        { name: 'Chat', description: 'AI agent chat sessions and human-in-the-loop approval' },
        { name: 'Cases', description: 'Support case management, assignment, timeline, notes' },
        { name: 'Customers', description: 'Customer profile, orders, and transaction history' },
        { name: 'Orders', description: 'Order detail, tracking, cancellation' },
        { name: 'Refunds', description: 'Refund request lifecycle management' },
        { name: 'Documents', description: 'Knowledge base documents with pgvector semantic search' },
        { name: 'Feedback', description: 'CSAT feedback submission and analytics' },
        { name: 'Analytics', description: 'KPI dashboards, topic breakdown, agent performance' },
        { name: 'Admin', description: 'User management and role assignment (admin only)' },
        { name: 'Experiments', description: 'LLM evaluation runs against golden dataset' },
      ],
    },
  });

  // ─── Swagger UI ───────────────────────────────────────────────────────────
  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
    logo: {
      type: 'image/svg+xml',
      content: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="#4F46E5"/>
          <text x="50" y="67" text-anchor="middle" font-size="48" font-family="Arial" fill="white">🤖</text>
        </svg>`
      ).toString('base64'),
    },
    theme: {
      title: 'Customer Support Agent — API Docs',
      css: [
        {
          filename: 'theme.css',
          content: `
            .swagger-ui .topbar { background-color: #1e1b4b; }
            .swagger-ui .topbar .download-url-wrapper { display: none; }
            .swagger-ui .info .title { color: #4F46E5; }
            .swagger-ui .btn.authorize { background-color: #4F46E5; border-color: #4F46E5; }
            .swagger-ui .btn.authorize svg { fill: #fff; }
          `,
        },
      ],
    },
  });

  app.log.info('📖 Swagger UI available at /api/docs');
}

export default fp(swaggerPlugin, {
  name: 'swagger-plugin',
  fastify: '>=4.0.0',
});
