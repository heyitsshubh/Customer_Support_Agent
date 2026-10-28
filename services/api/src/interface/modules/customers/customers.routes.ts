import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import { CustomerParamsDto, CustomerParamsSchema, CustomerOrdersQueryDto, CustomerOrdersQuerySchema } from './customers.schema.js';

export const customersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { customerRepository, orderRepository, caseRepository, sql } = fastify.container.cradle;

  // GET /api/v1/customers/:id: Customer profile
  fastify.get<{ Params: CustomerParamsDto }>(
    '/customers/:id',
    {
      preHandler: [fastify.authenticate],
      schema: { params: CustomerParamsSchema },
    },
    async (request, reply) => {
      const customer = await customerRepository.findById(request.params.id);
      if (!customer) {
        throw new NotFoundError('Customer', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        data: {
          customer: {
            id: customer.id,
            email: customer.email.value,
            name: customer.name,
            tier: customer.tier,
            lifetimeValue: customer.lifetimeValue.amount,
            targetSlaMinutes: customer.getTargetSlaMinutes(),
            freeReturnShipping: customer.isEligibleForFreeReturnShipping(),
            createdAt: customer.createdAt,
          },
        },
      });
    }
  );

  // GET /api/v1/customers/:id/orders: Order history for customer
  fastify.get<{ Params: CustomerParamsDto; Querystring: CustomerOrdersQueryDto }>(
    '/customers/:id/orders',
    {
      preHandler: [fastify.authenticate],
      schema: { params: CustomerParamsSchema, querystring: CustomerOrdersQuerySchema },
    },
    async (request, reply) => {
      const limit = request.query.limit || 10;
      const orders = await orderRepository.findOrdersByCustomerId(request.params.id, limit);

      return reply.status(200).send({
        success: true,
        data: {
          customerId: request.params.id,
          total: orders.length,
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            totalAmount: o.totalAmount.amount,
            items: o.items,
            trackingNumber: o.trackingNumber,
            carrier: o.carrier,
            createdAt: o.createdAt,
          })),
        },
      });
    }
  );

  // GET /api/v1/customers/:id/transactions: Payment history
  fastify.get<{ Params: CustomerParamsDto }>(
    '/customers/:id/transactions',
    {
      preHandler: [fastify.authenticate],
      schema: { params: CustomerParamsSchema },
    },
    async (request, reply) => {
      const rows = await sql`
        SELECT t.id, t.order_id, t.amount, t.type, t.status, t.idempotency_key, t.created_at,
               o.order_number
        FROM transactions t
        JOIN orders o ON t.order_id = o.id
        WHERE o.customer_id = ${request.params.id}
        ORDER BY t.created_at DESC;
      `;

      return reply.status(200).send({
        success: true,
        data: {
          customerId: request.params.id,
          total: rows.length,
          transactions: rows.map((r) => ({
            id: r.id,
            orderId: r.order_id,
            orderNumber: r.order_number,
            amount: Number(r.amount),
            type: r.type,
            status: r.status,
            idempotencyKey: r.idempotency_key,
            createdAt: r.created_at,
          })),
        },
      });
    }
  );

  // GET /api/v1/customers/:id/cases: Support cases history
  fastify.get<{ Params: CustomerParamsDto }>(
    '/customers/:id/cases',
    {
      preHandler: [fastify.authenticate],
      schema: { params: CustomerParamsSchema },
    },
    async (request, reply) => {
      const cases = await caseRepository.findMany({ customerId: request.params.id, limit: 50 });

      return reply.status(200).send({
        success: true,
        data: {
          customerId: request.params.id,
          total: cases.length,
          cases: cases.map((c) => ({
            id: c.id,
            threadId: c.threadId,
            status: c.status.value,
            priority: c.priority,
            intent: c.intent,
            summary: c.summary,
            createdAt: c.createdAt,
            resolvedAt: c.resolvedAt,
          })),
        },
      });
    }
  );
};
