import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { StartChatUseCase } from '../../../application/use-cases/chat/StartChatUseCase.js';
import { SendMessageUseCase } from '../../../application/use-cases/chat/SendMessageUseCase.js';
import { ApproveCaseUseCase } from '../../../application/use-cases/chat/ApproveCaseUseCase.js';
import {
  StartChatBodyDto,
  StartChatBodySchema,
  SendMessageBodyDto,
  SendMessageBodySchema,
  ApproveCaseBodyDto,
  ApproveCaseBodySchema,
} from './chat.schema.js';

export const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { caseRepository, customerRepository, refundRepository, aiAgentClient } = fastify.container.cradle;

  const startChatUseCase = new StartChatUseCase(caseRepository, customerRepository, aiAgentClient);
  const sendMessageUseCase = new SendMessageUseCase(caseRepository, aiAgentClient);
  const approveCaseUseCase = new ApproveCaseUseCase(caseRepository, refundRepository, aiAgentClient);

  // POST /api/v1/chat: Start a new support chat conversation
  fastify.post<{ Body: StartChatBodyDto }>(
    '/chat',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: StartChatBodySchema,
      },
    },
    async (request, reply) => {
      const output = await startChatUseCase.execute({
        customerId: request.body.customerId,
        message: request.body.message,
        orderNumber: request.body.orderNumber,
      });

      return reply.status(200).send({
        success: true,
        data: output,
      });
    }
  );

  // POST /api/v1/chat/:threadId/message: Continue an ongoing conversation
  fastify.post<{ Params: { threadId: string }; Body: SendMessageBodyDto }>(
    '/chat/:threadId/message',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: SendMessageBodySchema,
      },
    },
    async (request, reply) => {
      const output = await sendMessageUseCase.execute({
        threadId: request.params.threadId,
        message: request.body.message,
      });

      return reply.status(200).send({
        success: true,
        data: output,
      });
    }
  );

  // POST /api/v1/chat/:threadId/approve: Supervisor approval gate
  // Strictly protected: Requires role 'reviewer' or 'admin'
  fastify.post<{ Params: { threadId: string }; Body: ApproveCaseBodyDto }>(
    '/chat/:threadId/approve',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: {
        body: ApproveCaseBodySchema,
      },
    },
    async (request, reply) => {
      const output = await approveCaseUseCase.execute({
        threadId: request.params.threadId,
        approved: request.body.approved,
        approverId: request.user!.userId,
        notes: request.body.notes,
      });

      return reply.status(200).send({
        success: true,
        data: output,
      });
    }
  );

  // GET /api/v1/chat/:threadId: Retrieve conversation thread details and state snapshot
  fastify.get<{ Params: { threadId: string } }>(
    '/chat/:threadId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findByThreadId(request.params.threadId);
      if (!supportCase) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Case not found for thread' },
        });
      }

      const agentState = await aiAgentClient.getAgentState(request.params.threadId).catch(() => null);

      return reply.status(200).send({
        success: true,
        data: {
          case: {
            id: supportCase.id,
            threadId: supportCase.threadId,
            customerId: supportCase.customerId,
            status: supportCase.status.value,
            priority: supportCase.priority,
            intent: supportCase.intent,
            summary: supportCase.summary,
            resolutionNotes: supportCase.resolutionNotes,
            createdAt: supportCase.createdAt,
            resolvedAt: supportCase.resolvedAt,
          },
          agentState,
        },
      });
    }
  );
};
