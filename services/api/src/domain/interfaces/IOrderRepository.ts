import { Order } from '../entities/Order.js';
import { Transaction } from '../entities/Transaction.js';

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
  findOrdersByCustomerId(customerId: string, limit?: number): Promise<Order[]>;
  findTransactionsByOrderId(orderId: string): Promise<Transaction[]>;
  saveOrder(order: Order): Promise<void>;
  saveTransaction(transaction: Transaction): Promise<void>;
}
