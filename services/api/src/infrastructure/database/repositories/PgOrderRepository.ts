import postgres from 'postgres';
import { IOrderRepository } from '../../../domain/interfaces/IOrderRepository.js';
import { Order, OrderStatus, OrderItem } from '../../../domain/entities/Order.js';
import { Transaction, TransactionType, TransactionStatus } from '../../../domain/entities/Transaction.js';
import { Money } from '../../../domain/value-objects/Money.js';

export class PgOrderRepository implements IOrderRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async findById(id: string): Promise<Order | null> {
    const rows = await this.sql`
      SELECT id, customer_id, order_number, status, total_amount, items, tracking_number, carrier, created_at, updated_at
      FROM orders
      WHERE id = ${id}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapOrderToDomain(rows[0]);
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const rows = await this.sql`
      SELECT id, customer_id, order_number, status, total_amount, items, tracking_number, carrier, created_at, updated_at
      FROM orders
      WHERE order_number = ${orderNumber.trim()}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapOrderToDomain(rows[0]);
  }

  async findOrdersByCustomerId(customerId: string, limit = 10): Promise<Order[]> {
    const rows = await this.sql`
      SELECT id, customer_id, order_number, status, total_amount, items, tracking_number, carrier, created_at, updated_at
      FROM orders
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    return rows.map((r) => this.mapOrderToDomain(r));
  }

  async findTransactionsByOrderId(orderId: string): Promise<Transaction[]> {
    const rows = await this.sql`
      SELECT id, order_id, amount, type, status, idempotency_key, payment_gateway, created_at
      FROM transactions
      WHERE order_id = ${orderId}
      ORDER BY created_at ASC;
    `;
    return rows.map((r) => this.mapTransactionToDomain(r));
  }

  async saveOrder(order: Order): Promise<void> {
    await this.sql`
      INSERT INTO orders (id, customer_id, order_number, status, total_amount, items, tracking_number, carrier, created_at, updated_at)
      VALUES (
        ${order.id},
        ${order.customerId},
        ${order.orderNumber},
        ${order.status},
        ${order.totalAmount.amount},
        ${JSON.stringify(order.items)}::jsonb,
        ${order.trackingNumber || null},
        ${order.carrier || null},
        ${order.createdAt},
        ${order.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_number = EXCLUDED.tracking_number,
        carrier = EXCLUDED.carrier,
        updated_at = EXCLUDED.updated_at;
    `;
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    await this.sql`
      INSERT INTO transactions (id, order_id, amount, type, status, idempotency_key, payment_gateway, created_at)
      VALUES (
        ${transaction.id},
        ${transaction.orderId},
        ${transaction.amount.amount},
        ${transaction.type},
        ${transaction.status},
        ${transaction.idempotencyKey},
        ${transaction.paymentGateway},
        ${transaction.createdAt}
      )
      ON CONFLICT (idempotency_key) DO UPDATE SET
        status = EXCLUDED.status;
    `;
  }

  private mapOrderToDomain(row: Record<string, unknown>): Order {
    return new Order(
      row.id as string,
      row.customer_id as string,
      row.order_number as string,
      row.status as OrderStatus,
      new Money(Number(row.total_amount)),
      (row.items as OrderItem[]) || [],
      row.tracking_number as string | undefined,
      row.carrier as string | undefined,
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    );
  }

  private mapTransactionToDomain(row: Record<string, unknown>): Transaction {
    return new Transaction(
      row.id as string,
      row.order_id as string,
      new Money(Number(row.amount)),
      row.type as TransactionType,
      row.status as TransactionStatus,
      row.idempotency_key as string,
      row.payment_gateway as string,
      new Date(row.created_at as string)
    );
  }
}
