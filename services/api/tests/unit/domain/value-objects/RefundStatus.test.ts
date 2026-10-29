/**
 * Unit tests for RefundStatus value object.
 * Tests the refund lifecycle state machine invariants.
 */

import { RefundStatus } from '../../../../src/domain/value-objects/RefundStatus';

describe('RefundStatus', () => {
  describe('valid transitions', () => {
    it('should allow PENDING → APPROVED', () => {
      expect(RefundStatus.PENDING.canTransitionTo(RefundStatus.APPROVED)).toBe(true);
    });

    it('should allow PENDING → REJECTED', () => {
      expect(RefundStatus.PENDING.canTransitionTo(RefundStatus.REJECTED)).toBe(true);
    });

    it('should allow APPROVED → EXECUTED', () => {
      expect(RefundStatus.APPROVED.canTransitionTo(RefundStatus.EXECUTED)).toBe(true);
    });

    it('should allow APPROVED → FAILED', () => {
      expect(RefundStatus.APPROVED.canTransitionTo(RefundStatus.FAILED)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('should NOT allow PENDING → EXECUTED (must be approved first)', () => {
      expect(RefundStatus.PENDING.canTransitionTo(RefundStatus.EXECUTED)).toBe(false);
    });

    it('should NOT allow REJECTED → APPROVED (cannot un-reject)', () => {
      expect(RefundStatus.REJECTED.canTransitionTo(RefundStatus.APPROVED)).toBe(false);
    });

    it('should NOT allow EXECUTED → any state (terminal)', () => {
      expect(RefundStatus.EXECUTED.canTransitionTo(RefundStatus.PENDING)).toBe(false);
      expect(RefundStatus.EXECUTED.canTransitionTo(RefundStatus.APPROVED)).toBe(false);
      expect(RefundStatus.EXECUTED.canTransitionTo(RefundStatus.FAILED)).toBe(false);
    });

    it('should NOT allow FAILED → EXECUTED (terminal)', () => {
      expect(RefundStatus.FAILED.canTransitionTo(RefundStatus.EXECUTED)).toBe(false);
    });

    it('should NOT allow REJECTED → EXECUTED', () => {
      expect(RefundStatus.REJECTED.canTransitionTo(RefundStatus.EXECUTED)).toBe(false);
    });
  });

  describe('isFinal()', () => {
    it('EXECUTED should be final', () => {
      expect(RefundStatus.EXECUTED.isFinal()).toBe(true);
    });

    it('REJECTED should be final', () => {
      expect(RefundStatus.REJECTED.isFinal()).toBe(true);
    });

    it('FAILED should be final', () => {
      expect(RefundStatus.FAILED.isFinal()).toBe(true);
    });

    it('PENDING should not be final', () => {
      expect(RefundStatus.PENDING.isFinal()).toBe(false);
    });

    it('APPROVED should not be final', () => {
      expect(RefundStatus.APPROVED.isFinal()).toBe(false);
    });
  });

  describe('transition()', () => {
    it('should return new RefundStatus on valid transition', () => {
      const approved = RefundStatus.PENDING.transition(RefundStatus.APPROVED);
      expect(approved.value).toBe(RefundStatus.APPROVED.value);
    });

    it('should throw on invalid transition', () => {
      expect(() => RefundStatus.REJECTED.transition(RefundStatus.APPROVED)).toThrow();
    });
  });

  describe('equals()', () => {
    it('should be equal to same status', () => {
      expect(RefundStatus.PENDING.equals(RefundStatus.PENDING)).toBe(true);
    });

    it('should not be equal to different status', () => {
      expect(RefundStatus.PENDING.equals(RefundStatus.APPROVED)).toBe(false);
    });
  });
});
