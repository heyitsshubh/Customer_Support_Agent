import { randomUUID } from 'node:crypto';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import { RefundRequest } from '../../../domain/entities/RefundRequest.js';
import { RefundStatus } from '../../../domain/value-objects/RefundStatus.js';
import { Money } from '../../../domain/value-objects/Money.js';
import {
  ListRefundsQueryDto,
  ListRefundsQuerySchema,
  CreateRefundBodyDto,
  CreateRefundBodySchema,
  UpdateRefundStatusBodyDto,
  UpdateRefundStatusBodySchema,
} from './refunds.schema.js';

export const refundsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { refundRepository, sql } = fastify.container.cradle;

  // GET /api/v1/refunds: List all refunds (filter by status)
  fastify.get<{ Querystring: ListRefundsQueryDto }>(
    '/refunds',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: { querystring: ListRefundsQuerySchema },
    },
    async (request, reply) => {
      const limit = request.query.limit || 20;
      const status = request.query.status;

      const rows = await sql`
        SELECT r.id, r.case_id, r.transaction_id, r.amount, r.status, r.idempotency_key,
               r.approver_id, r.approved_at, r.reason, r.notes, r.created_at,
               c.thread_id, u.name as approver_name
        FROM refund_requests r
        JOIN support_cases c ON r.case_id = c.id
        LEFT JOIN users u ON r.approver_id = u.id
        WHERE (${status ? sql`r.status = ${status}` : sql`TRUE`})
        ORDER BY r.created_at DESC
        LIMIT ${limit};
      `;

      return reply.status(200).send({
        success: true,
        data: {
          total: rows.length,
          refunds: rows.map((r) => ({
            id: r.id,
            caseId: r.case_id,
            threadId: r.thread_id,
            transactionId: r.transaction_id,
            amount: Number(r.amount),
            status: r.status,
            idempotencyKey: r.idempotency_key,
            approverId: r.approver_id,
            approverName: r.approver_name,
            approvedAt: r.approved_at,
            reason: r.reason,
            notes: r.notes,
            createdAt: r.created_at,
          })),
        },
      });
    }
  );

  // GET /api/v1/refunds/:id: Single refund request details
  fastify.get<{ Params: { id: string } }>(
    '/refunds/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const refund = await refundRepository.findById(request.params.id);
      if (!refund) {
        throw new NotFoundError('RefundRequest', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        data: {
          refund: {
            id: refund.id,
            caseId: refund.caseId,
            transactionId: refund.transactionId,
            amount: refund.amount.amount,
            status: refund.status.value,
            idempotencyKey: refund.idempotencyKey,
            approverId: refund.approverId,
            approvedAt: refund.approvedAt,
            reason: refund.reason,
            notes: refund.notes,
            createdAt: refund.createdAt,
          },
        },
      });
    }
  );

  // POST /api/v1/refunds: Manually initiate a refund request
  fastify.post<{ Body: CreateRefundBodyDto }>(
    '/refunds',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['agent', 'reviewer', 'admin'])],
      schema: { body: CreateRefundBodySchema },
    },
    async (request, reply) => {
      const idempotencyKey = `manual_ref_${request.body.transactionId}_${randomUUID().slice(0, 8)}`;
      const refundId = randomUUID();

      const newRefund = new RefundRequest(
        refundId,
        request.body.caseId,
        request.body.transactionId,
        new Money(request.body.amount),
        RefundStatus.PENDING,
        idempotencyKey,
        request.body.reason,
        undefined,
        undefined,
        request.body.notes
      );

      await refundRepository.save(newRefund);

      return reply.status(201).send({
        success: true,
        message: 'Refund request created and queued for supervisor review.',
        data: {
          id: newRefund.id,
          amount: newRefund.amount.amount,
          status: newRefund.status.value,
          idempotencyKey: newRefund.idempotencyKey,
        },
      });
    }
  );

  // PATCH /api/v1/refunds/:id/status: Approve/Reject refund
  fastify.patch<{ Params: { id: string }; Body: UpdateRefundStatusBodyDto }>(
    '/refunds/:id/status',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: { body: UpdateRefundStatusBodySchema },
    },
    async (request, reply) => {
      const refund = await refundRepository.findById(request.params.id);
      if (!refund) {
        throw new NotFoundError('RefundRequest', request.params.id);
      }

      if (request.body.status === 'approved') {
        refund.approve(request.user!.userId, request.body.notes);
      } else if (request.body.status === 'rejected') {
        refund.reject(request.user!.userId, request.body.notes);
      } else if (request.body.status === 'executed') {
        refund.markExecuted();
      }

      await refundRepository.save(refund);

      return reply.status(200).send({
        success: true,
        message: `Refund ${refund.id} updated to status '${refund.status.value}'`,
        data: {
          id: refund.id,
          status: refund.status.value,
          approverId: refund.approverId,
          approvedAt: refund.approvedAt,
        },
      });
    }
  );
};
