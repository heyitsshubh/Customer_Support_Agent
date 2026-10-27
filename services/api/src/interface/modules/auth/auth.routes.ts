import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PasswordUtil } from '../../../infrastructure/security/password.js';
import { JwtUtil } from '../../../infrastructure/security/jwt.js';
import { AuthenticationError } from '../../../domain/errors/DomainErrors.js';
import {
  RegisterRequestDto,
  RegisterRequestSchema,
  LoginRequestDto,
  LoginRequestSchema,
  RefreshTokenRequestDto,
  RefreshTokenRequestSchema,
} from './auth.schema.js';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const sql = fastify.container.cradle.sql;
  const cacheService = fastify.container.cradle.cacheService;

  // POST /api/v1/auth/register
  fastify.post<{ Body: RegisterRequestDto }>(
    '/auth/register',
    {
      schema: {
        body: RegisterRequestSchema,
      },
    },
    async (request, reply) => {
      const { email, password, name, role = 'agent' } = request.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existing = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
      `;
      if (existing.length > 0) {
        return reply.status(409).send({
          success: false,
          error: { code: 'USER_EXISTS', message: 'A user with this email already exists' },
        });
      }

      const passwordHash = await PasswordUtil.hash(password);

      const [newUser] = await sql`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (${normalizedEmail}, ${passwordHash}, ${name}, ${role})
        RETURNING id, email, name, role, created_at;
      `;

      // If registered as customer, ensure customer record exists
      if (role === 'customer') {
        await sql`
          INSERT INTO customers (id, email, name, tier)
          VALUES (${newUser.id}, ${newUser.email}, ${newUser.name}, 'standard')
          ON CONFLICT (email) DO NOTHING;
        `;
      }

      const tokens = JwtUtil.generateTokenPair({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      return reply.status(201).send({
        success: true,
        data: {
          user: newUser,
          tokens,
        },
      });
    }
  );

  // POST /api/v1/auth/login
  fastify.post<{ Body: LoginRequestDto }>(
    '/auth/login',
    {
      schema: {
        body: LoginRequestSchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const normalizedEmail = email.toLowerCase().trim();

      const [user] = await sql`
        SELECT id, email, name, role, password_hash, is_active
        FROM users
        WHERE email = ${normalizedEmail}
        LIMIT 1;
      `;

      if (!user || !user.is_active) {
        throw new AuthenticationError('Invalid email or password');
      }

      const isPasswordValid = await PasswordUtil.verify(password, user.password_hash);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      const tokens = JwtUtil.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tokens,
        },
      });
    }
  );

  // POST /api/v1/auth/refresh
  fastify.post<{ Body: RefreshTokenRequestDto }>(
    '/auth/refresh',
    {
      schema: {
        body: RefreshTokenRequestSchema,
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;
      const payload = JwtUtil.verifyToken(refreshToken);

      // Verify user still exists and active
      const [user] = await sql`
        SELECT id, email, role, is_active FROM users WHERE id = ${payload.userId} LIMIT 1
      `;
      if (!user || !user.is_active) {
        throw new AuthenticationError('User no longer active');
      }

      const newTokens = JwtUtil.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.status(200).send({
        success: true,
        data: {
          tokens: newTokens,
        },
      });
    }
  );

  // POST /api/v1/auth/logout
  fastify.post(
    '/auth/logout',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization!;
      const token = authHeader.split(' ')[1];

      // Blacklist token in Redis with a 24-hour TTL
      await cacheService.set(`blacklist:${token}`, 'revoked', 86400);

      return reply.status(200).send({
        success: true,
        message: 'Successfully logged out and session revoked',
      });
    }
  );

  // GET /api/v1/users/me
  fastify.get(
    '/users/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const [user] = await sql`
        SELECT id, email, name, role, is_active, created_at
        FROM users
        WHERE id = ${request.user!.userId}
        LIMIT 1;
      `;

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      return reply.status(200).send({
        success: true,
        data: { user },
      });
    }
  );
};
