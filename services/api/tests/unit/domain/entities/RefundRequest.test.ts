/**
 * Unit tests for RefundRequest entity.
 * Tests approve/reject/execute state transitions and invariants.
 */

import { RefundRequest } from '../../../../src/domain/entities/RefundRequest';
import { RefundStatus } from '../../../../src/domain/value-objects/RefundStatus';
import { Money } from '../../../../src/domain/value-objects/Money';

describe('RefundRequest', () => {
  function makeRefund(overrides: Partial<{
    id: string;
    caseId: string;
    customerId: string;
    amount: number;
    reason: string;
  }> = {}): RefundRequest {
    return RefundRequest.create({
      id: overrides.id ?? 'refund-001',
      caseId: overrides.caseId ?? 'case-001',
      customerId: overrides.customerId ?? 'customer-001',
      amount: new Money(overrides.amount ?? 89.99, 'USD'),
      reason: overrides.reason ?? 'Duplicate charge detected on ORD-1042',
    });
  }

  describe('create()', () => {
    it('should create a RefundRequest with PENDING status', () => {
      const refund = makeRefund();
      expect(refund.status.equals(RefundStatus.PENDING)).toBe(true);
    });

    it('should store the correct amount', () => {
      const refund = makeRefund({ amount: 199.99 });
      expect(refund.amount.amount).toBeCloseTo(199.99, 2);
    });

    it('should store the reason', () => {
      const refund = makeRefund({ reason: 'Overcharged' });
      expect(refund.reason).toBe('Overcharged');
    });
  });

  describe('approve()', () => {
    it('should transition to APPROVED from PENDING', () => {
      const refund = makeRefund();
      refund.approve('supervisor-001', 'Valid duplicate charge confirmed.');
      expect(refund.status.equals(RefundStatus.APPROVED)).toBe(true);
    });

    it('should store the approver ID and notes', () => {
      const refund = makeRefund();
      refund.approve('supervisor-007', 'Approved after review.');
      expect(refund.approvedById).toBe('supervisor-007');
      expect(refund.approvalNotes).toBe('Approved after review.');
    });

    it('should throw if already APPROVED', () => {
      const refund = makeRefund();
      refund.approve('supervisor-001', 'First approval');
      expect(() => refund.approve('supervisor-002', 'Second approval')).toThrow();
    });

    it('should throw if already REJECTED', () => {
      const refund = makeRefund();
      refund.reject('supervisor-001', 'Policy violation');
      expect(() => refund.approve('supervisor-002', 'Changed mind')).toThrow();
    });
  });

  describe('reject()', () => {
    it('should transition to REJECTED from PENDING', () => {
      const refund = makeRefund();
      refund.reject('supervisor-001', 'Not eligible per policy.');
      expect(refund.status.equals(RefundStatus.REJECTED)).toBe(true);
    });

    it('should store the rejection reason', () => {
      const refund = makeRefund();
      refund.reject('supervisor-001', 'Outside 30-day window.');
      expect(refund.rejectionReason).toBe('Outside 30-day window.');
    });

    it('should throw if trying to reject after APPROVED', () => {
      const refund = makeRefund();
      refund.approve('supervisor-001', 'Approved');
      expect(() => refund.reject('supervisor-002', 'Changed mind')).toThrow();
    });

    it('should throw if already REJECTED', () => {
      const refund = makeRefund();
      refund.reject('supervisor-001', 'Rejected');
      expect(() => refund.reject('supervisor-002', 'Rejected again')).toThrow();
    });
  });

  describe('execute()', () => {
    it('should transition to EXECUTED from APPROVED', () => {
      const refund = makeRefund();
      refund.approve('supervisor-001', 'Approved');
      refund.execute('txn-refund-001');
      expect(refund.status.equals(RefundStatus.EXECUTED)).toBe(true);
    });

    it('should store the refund transaction ID', () => {
      const refund = makeRefund();
      refund.approve('supervisor-001', 'Approved');
      refund.execute('txn-refund-xyz');
      expect(refund.refundTransactionId).toBe('txn-refund-xyz');
    });

    it('should throw if trying to execute without approval', () => {
      const refund = makeRefund();
      expect(() => refund.execute('txn-001')).toThrow();
    });

    it('should throw if REJECTED', () => {
      const refund = makeRefund();
      refund.reject('supervisor-001', 'Rejected');
      expect(() => refund.execute('txn-001')).toThrow();
    });

    it('should throw if already EXECUTED (idempotency guard)', () => {
      const refund = makeRefund();
      refund.approve('supervisor-001', 'Approved');
      refund.execute('txn-001');
      expect(() => refund.execute('txn-002')).toThrow();
    });
  });

  describe('full happy path', () => {
    it('should complete the full PENDING → APPROVED → EXECUTED lifecycle', () => {
      const refund = makeRefund();
      expect(refund.status.equals(RefundStatus.PENDING)).toBe(true);

      refund.approve('supervisor-001', 'Confirmed duplicate charge.');
      expect(refund.status.equals(RefundStatus.APPROVED)).toBe(true);

      refund.execute('txn-refund-complete-001');
      expect(refund.status.equals(RefundStatus.EXECUTED)).toBe(true);
    });
  });
});
