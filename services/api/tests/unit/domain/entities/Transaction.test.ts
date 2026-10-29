/**
 * Unit tests for Transaction entity.
 * Focuses on the isDuplicateOf() duplicate detection logic.
 */

import { Transaction } from '../../../../src/domain/entities/Transaction';
import { Money } from '../../../../src/domain/value-objects/Money';

describe('Transaction', () => {
  const baseDate = new Date('2024-01-15T10:00:00Z');

  function makeTransaction(overrides: Partial<{
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    type: string;
    description: string;
    createdAt: Date;
  }> = {}): Transaction {
    return new Transaction({
      id: overrides.id ?? 'txn-001',
      orderId: overrides.orderId ?? 'order-001',
      amount: new Money(overrides.amount ?? 99.99, overrides.currency ?? 'USD'),
      type: overrides.type ?? 'charge',
      description: overrides.description ?? 'Monthly subscription',
      createdAt: overrides.createdAt ?? baseDate,
    });
  }

  describe('isDuplicateOf()', () => {
    it('should return true for same orderId, amount, and type within time window', () => {
      const txn1 = makeTransaction({ id: 'txn-001', createdAt: baseDate });
      const txn2 = makeTransaction({
        id: 'txn-002',
        createdAt: new Date(baseDate.getTime() + 60_000), // 1 minute later
      });
      expect(txn1.isDuplicateOf(txn2)).toBe(true);
    });

    it('should return false for different order IDs', () => {
      const txn1 = makeTransaction({ orderId: 'order-001' });
      const txn2 = makeTransaction({ orderId: 'order-002' });
      expect(txn1.isDuplicateOf(txn2)).toBe(false);
    });

    it('should return false for different amounts', () => {
      const txn1 = makeTransaction({ amount: 99.99 });
      const txn2 = makeTransaction({ amount: 149.99 });
      expect(txn1.isDuplicateOf(txn2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const txn1 = makeTransaction({ currency: 'USD' });
      const txn2 = makeTransaction({ currency: 'EUR' });
      expect(txn1.isDuplicateOf(txn2)).toBe(false);
    });

    it('should return false for different transaction types', () => {
      const txn1 = makeTransaction({ type: 'charge' });
      const txn2 = makeTransaction({ type: 'refund' });
      expect(txn1.isDuplicateOf(txn2)).toBe(false);
    });

    it('should return false for transactions outside the time window (> 5 minutes)', () => {
      const txn1 = makeTransaction({ id: 'txn-001', createdAt: baseDate });
      const txn2 = makeTransaction({
        id: 'txn-002',
        createdAt: new Date(baseDate.getTime() + 6 * 60_000), // 6 minutes later
      });
      expect(txn1.isDuplicateOf(txn2)).toBe(false);
    });

    it('should return false when comparing a transaction with itself (same id)', () => {
      const txn = makeTransaction({ id: 'txn-001' });
      expect(txn.isDuplicateOf(txn)).toBe(false);
    });

    it('should be commutative: txn1.isDuplicateOf(txn2) === txn2.isDuplicateOf(txn1)', () => {
      const txn1 = makeTransaction({ id: 'txn-001', createdAt: baseDate });
      const txn2 = makeTransaction({
        id: 'txn-002',
        createdAt: new Date(baseDate.getTime() + 30_000),
      });
      expect(txn1.isDuplicateOf(txn2)).toBe(txn2.isDuplicateOf(txn1));
    });

    it('should detect the ORD-1042 duplicate charge scenario', () => {
      // Simulates the seed data scenario: two charges for same order within 5 min
      const firstCharge = makeTransaction({
        id: 'txn-seed-001',
        orderId: 'ORD-1042',
        amount: 89.99,
        type: 'charge',
        createdAt: new Date('2024-01-15T14:30:00Z'),
      });
      const duplicateCharge = makeTransaction({
        id: 'txn-seed-002',
        orderId: 'ORD-1042',
        amount: 89.99,
        type: 'charge',
        createdAt: new Date('2024-01-15T14:32:00Z'), // 2 min later
      });
      expect(firstCharge.isDuplicateOf(duplicateCharge)).toBe(true);
    });
  });

  describe('toJSON()', () => {
    it('should serialize correctly', () => {
      const txn = makeTransaction();
      const json = txn.toJSON();
      expect(json).toHaveProperty('id', 'txn-001');
      expect(json).toHaveProperty('orderId', 'order-001');
      expect(json).toHaveProperty('amount');
      expect(json).toHaveProperty('type', 'charge');
    });
  });
});
