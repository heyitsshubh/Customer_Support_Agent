import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError, DomainError } from '../../../domain/errors/DomainErrors.js';
import { OrderParamsDto, OrderParamsSchema, CancelOrderBodyDto, CancelOrderBodySchema } from './orders.schema.js';

export const ordersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { orderRepository, sql } = fastify.container.cradle;

  // GET /api/v1/orders/:id: Get single order detail
  fastify.get<{ Params: OrderParamsDto }>(
    '/orders/:id',
    {
      preHandler: [fastify.authenticate],
      schema: { params: OrderParamsSchema },
    },
    async (request, reply) => {
      const order = await orderRepository.findById(request.params.id) || 
                    await orderRepository.findByOrderNumber(request.params.id);

      if (!order) {
        throw new NotFoundError('Order', request.params.id);
      }

      const transactions = await orderRepository.findTransactionsByOrderId(order.id);

      return reply.status(200).send({
        success: true,
        data: {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount.amount,
            items: order.items,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
          transactions: transactions.map((t) => ({
            id: t.id,
            amount: t.amount.amount,
            type: t.type,
            status: t.status,
            idempotencyKey: t.idempotencyKey,
            createdAt: t.createdAt,
          })),
        },
      });
    }
  );

  // GET /api/v1/orders/:id/tracking: Shipment tracking details
  fastify.get<{ Params: OrderParamsDto }>(
    '/orders/:id/tracking',
    {
      preHandler: [fastify.authenticate],
      schema: { params: OrderParamsSchema },
    },
    async (request, reply) => {
      const order = await orderRepository.findById(request.params.id) || 
                    await orderRepository.findByOrderNumber(request.params.id);

      if (!order) {
        throw new NotFoundError('Order', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        data: {
          orderNumber: order.orderNumber,
          status: order.status,
          carrier: order.carrier || 'Not assigned',
          trackingNumber: order.trackingNumber || 'Pending pickup',
          isDelivered: order.isDelivered(),
          isShipped: order.isShipped(),
          lastUpdated: order.updatedAt,
        },
      });
    }
  );

  // POST /api/v1/orders/:id/cancel: Cancel an order
  fastify.post<{ Params: OrderParamsDto; Body: CancelOrderBodyDto }>(
    '/orders/:id/cancel',
    {
      preHandler: [fastify.authenticate],
      schema: { params: OrderParamsSchema, body: CancelOrderBodySchema },
    },
    async (request, reply) => {
      const order = await orderRepository.findById(request.params.id) || 
                    await orderRepository.findByOrderNumber(request.params.id);

      if (!order) {
        throw new NotFoundError('Order', request.params.id);
      }

      if (!order.canBeCancelled()) {
        throw new DomainError('ORDER_CANNOT_BE_CANCELLED', `Cannot cancel order in status '${order.status}'. Please initiate a return instead.`);
      }

      order.status = 'cancelled';
      order.updatedAt = new Date();
      await orderRepository.saveOrder(order);

      return reply.status(200).send({
        success: true,
        message: `Order ${order.orderNumber} has been successfully cancelled.`,
        data: { orderNumber: order.orderNumber, status: order.status },
      });
    }
  );

  // GET /api/v1/transactions/:id: Single transaction detail
  fastify.get<{ Params: { id: string } }>(
    '/transactions/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const [txn] = await sql`
        SELECT t.id, t.order_id, t.amount, t.type, t.status, t.idempotency_key, t.payment_gateway, t.created_at,
               o.order_number
        FROM transactions t
        JOIN orders o ON t.order_id = o.id
        WHERE t.id = ${request.params.id}
        LIMIT 1;
      `;

      if (!txn) {
        throw new NotFoundError('Transaction', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        data: {
          transaction: {
            id: txn.id,
            orderId: txn.order_id,
            orderNumber: txn.order_number,
            amount: Number(txn.amount),
            type: txn.type,
            status: txn.status,
            idempotencyKey: txn.idempotency_key,
            paymentGateway: txn.payment_gateway,
            createdAt: txn.created_at,
          },
        },
      });
    }
  );
};
