import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import { CasePriority } from '../../../domain/entities/SupportCase.js';
import {
  ListCasesQueryDto,
  ListCasesQuerySchema,
  AssignCaseBodyDto,
  AssignCaseBodySchema,
  UpdatePriorityBodyDto,
  UpdatePriorityBodySchema,
  CloseCaseBodyDto,
  CloseCaseBodySchema,
  AddNoteBodyDto,
  AddNoteBodySchema,
} from './cases.schema.js';

export const casesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { caseRepository, sql } = fastify.container.cradle;

  // GET /api/v1/cases: List cases with status/priority filtering and pagination
  fastify.get<{ Querystring: ListCasesQueryDto }>(
    '/cases',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: ListCasesQuerySchema,
      },
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const offset = (page - 1) * limit;

      const filterOptions = {
        status: request.query.status,
        priority: request.query.priority,
        customerId: request.query.customerId,
        assignedTo: request.query.assignedTo,
        limit,
        offset,
      };

      const [cases, total] = await Promise.all([
        caseRepository.findMany(filterOptions),
        caseRepository.count(filterOptions),
      ]);

      return reply.status(200).send({
        success: true,
        data: {
          cases: cases.map((c) => ({
            id: c.id,
            threadId: c.threadId,
            customerId: c.customerId,
            status: c.status.value,
            priority: c.priority,
            intent: c.intent,
            summary: c.summary,
            assignedTo: c.assignedTo,
            resolutionNotes: c.resolutionNotes,
            createdAt: c.createdAt,
            resolvedAt: c.resolvedAt,
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    }
  );

  // GET /api/v1/cases/pending-approval: Supervisor queue of paused cases
  fastify.get(
    '/cases/pending-approval',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
    },
    async (_request, reply) => {
      const pendingCases = await caseRepository.findPendingApproval(50);

      // Join with refund request details for reviewer dashboard
      const caseIds = pendingCases.map((c) => c.id);
      let refundDetails: Record<string, any> = {};

      if (caseIds.length > 0) {
        const refunds = await sql`
          SELECT id, case_id, transaction_id, amount, status, reason, created_at
          FROM refund_requests
          WHERE case_id IN ${sql(caseIds)}
          ORDER BY created_at DESC;
        `;
        for (const r of refunds) {
          refundDetails[r.case_id] = r;
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          total: pendingCases.length,
          cases: pendingCases.map((c) => ({
            id: c.id,
            threadId: c.threadId,
            customerId: c.customerId,
            status: c.status.value,
            priority: c.priority,
            intent: c.intent,
            summary: c.summary,
            createdAt: c.createdAt,
            refundRequest: refundDetails[c.id] || null,
          })),
        },
      });
    }
  );

  // GET /api/v1/cases/:id: Get full single case detail
  fastify.get<{ Params: { id: string } }>(
    '/cases/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.params.id);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.params.id);
      }

      // Fetch customer details
      const [customer] = await sql`
        SELECT id, email, name, tier, lifetime_value FROM customers WHERE id = ${supportCase.customerId} LIMIT 1
      `;

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
            assignedTo: supportCase.assignedTo,
            resolutionNotes: supportCase.resolutionNotes,
            createdAt: supportCase.createdAt,
            resolvedAt: supportCase.resolvedAt,
          },
          customer: customer || null,
        },
      });
    }
  );

  // GET /api/v1/cases/:id/timeline: Event audit trail for this case
  fastify.get<{ Params: { id: string } }>(
    '/cases/:id/timeline',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.params.id);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.params.id);
      }

      const events = [
        {
          event: 'CaseCreated',
          timestamp: supportCase.createdAt,
          details: `Case opened by customer ${supportCase.customerId}`,
        },
      ];

      if (supportCase.status.isPendingApproval()) {
        events.push({
          event: 'ApprovalGateSuspended',
          timestamp: supportCase.updatedAt,
          details: 'Action suspended at supervisor approval gate (LangGraph interrupt)',
        });
      }

      if (supportCase.resolvedAt) {
        events.push({
          event: 'CaseResolved',
          timestamp: supportCase.resolvedAt,
          details: supportCase.resolutionNotes || 'Resolved by support workflow',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          caseId: supportCase.id,
          timeline: events,
        },
      });
    }
  );

  // PATCH /api/v1/cases/:id/assign: Reassign ticket to an agent
  fastify.post<{ Params: { id: string }; Body: AssignCaseBodyDto }>(
    '/cases/:id/assign',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: {
        body: AssignCaseBodySchema,
      },
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.params.id);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.params.id);
      }

      supportCase.assignTo(request.body.agentId);
      await caseRepository.save(supportCase);

      return reply.status(200).send({
        success: true,
        message: `Case ${supportCase.id} successfully assigned to agent ${request.body.agentId}`,
      });
    }
  );

  // PATCH /api/v1/cases/:id/priority: Update priority (low, medium, high, urgent)
  fastify.patch<{ Params: { id: string }; Body: UpdatePriorityBodyDto }>(
    '/cases/:id/priority',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: {
        body: UpdatePriorityBodySchema,
      },
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.params.id);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.params.id);
      }

      supportCase.setPriority(request.body.priority as CasePriority);
      await caseRepository.save(supportCase);

      return reply.status(200).send({
        success: true,
        message: `Case ${supportCase.id} priority updated to '${request.body.priority}'`,
      });
    }
  );

  // PATCH /api/v1/cases/:id/close: Close ticket
  fastify.patch<{ Params: { id: string }; Body: CloseCaseBodyDto }>(
    '/cases/:id/close',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: {
        body: CloseCaseBodySchema,
      },
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.params.id);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.params.id);
      }

      supportCase.resolve(request.body.resolutionNotes);
      supportCase.close();
      await caseRepository.save(supportCase);

      return reply.status(200).send({
        success: true,
        message: `Case ${supportCase.id} closed and marked resolved.`,
      });
    }
  );

  // POST /api/v1/cases/:id/notes: Add internal note
  fastify.post<{ Params: { id: string }; Body: AddNoteBodyDto }>(
    '/cases/:id/notes',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: AddNoteBodySchema,
      },
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.params.id);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.params.id);
      }

      const noteContent = `[${request.user?.role?.toUpperCase() || 'AGENT'} NOTE]: ${request.body.note}`;
      supportCase.summary = supportCase.summary ? `${supportCase.summary}\n${noteContent}` : noteContent;
      await caseRepository.save(supportCase);

      return reply.status(200).send({
        success: true,
        message: 'Internal note appended to case history.',
      });
    }
  );
};
