import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { JwtUtil, TokenPayload } from '../../infrastructure/security/jwt.js';
import { AuthenticationError, AuthorizationError } from '../../domain/errors/DomainErrors.js';
import { ICacheService } from '../../infrastructure/cache/RedisCacheService.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (allowedRoles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const cacheService = fastify.container.cradle.cacheService as ICacheService;

  // Authentication hook: extracts and validates Bearer token, checks Redis blacklist
  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header. Expected Bearer <token>');
    }

    const token = authHeader.split(' ')[1];

    // Check Redis token revocation blacklist
    const isBlacklisted = await cacheService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked. Please log in again.');
    }

    const payload = JwtUtil.verifyToken(token);
    request.user = payload;
  });

  // Authorization hook: Role-Based Access Control (RBAC)
  fastify.decorate(
    'authorize',
    (allowedRoles: string[]) =>
      async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        if (!request.user) {
          throw new AuthenticationError('Authentication required before role verification');
        }

        if (!allowedRoles.includes(request.user.role)) {
          throw new AuthorizationError(
            `access this resource. Requires one of [${allowedRoles.join(', ')}], but current role is '${request.user.role}'`
          );
        }
      }
  );
};

export const authPlugin = fp(authPluginAsync, {
  name: 'auth-plugin',
});
