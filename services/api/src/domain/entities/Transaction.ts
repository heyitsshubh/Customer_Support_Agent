import { Money } from '../value-objects/Money.js';

export type TransactionType = 'charge' | 'refund' | 'adjustment';
export type TransactionStatus = 'pending' | 'success' | 'failed';

export class Transaction {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly amount: Money,
    public readonly type: TransactionType,
    public status: TransactionStatus,
    public readonly idempotencyKey: string,
    public readonly paymentGateway = 'stripe',
    public readonly createdAt: Date = new Date()
  ) {}

  public isSuccessfulCharge(): boolean {
    return this.type === 'charge' && this.status === 'success';
  }

  public isRefundable(): boolean {
    return this.isSuccessfulCharge() && this.amount.isPositive();
  }

  /**
   * Identifies if another transaction represents a duplicate charge.
   * Defined as: same orderId, same amount, same type ('charge'), successful, but distinct IDs and idempotency keys.
   */
  public isDuplicateOf(other: Transaction): boolean {
    if (this.id === other.id) return false;
    return (
      this.orderId === other.orderId &&
      this.type === 'charge' &&
      other.type === 'charge' &&
      this.status === 'success' &&
      other.status === 'success' &&
      this.amount.equals(other.amount)
    );
  }
}
