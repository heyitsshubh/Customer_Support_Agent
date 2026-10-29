import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import {
  ListUsersQueryDto,
  ListUsersQuerySchema,
  UpdateUserRoleBodyDto,
  UpdateUserRoleBodySchema,
} from './admin.schema.js';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { sql } = fastify.container.cradle;

  // GET /api/v1/admin/users: List users and support agents
  fastify.get<{ Querystring: ListUsersQueryDto }>(
    '/admin/users',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
      schema: { querystring: ListUsersQuerySchema },
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const offset = (page - 1) * limit;
      const role = request.query.role;

      const [rows, [countResult]] = await Promise.all([
        sql`
          SELECT id, email, name, role, is_active, created_at, updated_at
          FROM users
          WHERE (${role ? sql`role = ${role}` : sql`TRUE`})
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset};
        `,
        sql`
          SELECT COUNT(*)::int as total
          FROM users
          WHERE (${role ? sql`role = ${role}` : sql`TRUE`});
        `,
      ]);

      const total = countResult ? countResult.total : 0;

      return reply.status(200).send({
        success: true,
        data: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          users: rows,
        },
      });
    }
  );

  // PATCH /api/v1/admin/users/:id/role: Update user role
  fastify.patch<{ Params: { id: string }; Body: UpdateUserRoleBodyDto }>(
    '/admin/users/:id/role',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
      schema: { body: UpdateUserRoleBodySchema },
    },
    async (request, reply) => {
      const [user] = await sql`
        UPDATE users
        SET role = ${request.body.role}, updated_at = NOW()
        WHERE id = ${request.params.id}
        RETURNING id, email, name, role, updated_at;
      `;

      if (!user) {
        throw new NotFoundError('User', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        message: `User ${user.email} role updated to '${user.role}'`,
        data: { user },
      });
    }
  );

  // DELETE /api/v1/admin/users/:id: Deactivate user
  fastify.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request, reply) => {
      const [user] = await sql`
        UPDATE users
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ${request.params.id}
        RETURNING id, email, is_active;
      `;

      if (!user) {
        throw new NotFoundError('User', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        message: `User account ${user.email} deactivated.`,
      });
    }
  );
};
