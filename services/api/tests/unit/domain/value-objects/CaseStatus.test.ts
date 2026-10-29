/**
 * Unit tests for CaseStatus value object.
 * Tests the state machine transitions and invariants.
 */

import { CaseStatus } from '../../../../src/domain/value-objects/CaseStatus';

describe('CaseStatus', () => {
  describe('valid transitions', () => {
    it('should allow OPEN → IN_PROGRESS', () => {
      const status = CaseStatus.OPEN;
      expect(status.canTransitionTo(CaseStatus.IN_PROGRESS)).toBe(true);
    });

    it('should allow OPEN → ESCALATED', () => {
      const status = CaseStatus.OPEN;
      expect(status.canTransitionTo(CaseStatus.ESCALATED)).toBe(true);
    });

    it('should allow IN_PROGRESS → PENDING_APPROVAL', () => {
      const status = CaseStatus.IN_PROGRESS;
      expect(status.canTransitionTo(CaseStatus.PENDING_APPROVAL)).toBe(true);
    });

    it('should allow PENDING_APPROVAL → RESOLVED', () => {
      const status = CaseStatus.PENDING_APPROVAL;
      expect(status.canTransitionTo(CaseStatus.RESOLVED)).toBe(true);
    });

    it('should allow IN_PROGRESS → RESOLVED', () => {
      const status = CaseStatus.IN_PROGRESS;
      expect(status.canTransitionTo(CaseStatus.RESOLVED)).toBe(true);
    });

    it('should allow ESCALATED → RESOLVED', () => {
      const status = CaseStatus.ESCALATED;
      expect(status.canTransitionTo(CaseStatus.RESOLVED)).toBe(true);
    });

    it('should allow any active state → CLOSED', () => {
      expect(CaseStatus.RESOLVED.canTransitionTo(CaseStatus.CLOSED)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('should NOT allow OPEN → RESOLVED (skipping IN_PROGRESS)', () => {
      const status = CaseStatus.OPEN;
      expect(status.canTransitionTo(CaseStatus.RESOLVED)).toBe(false);
    });

    it('should NOT allow CLOSED → OPEN (re-open)', () => {
      const status = CaseStatus.CLOSED;
      expect(status.canTransitionTo(CaseStatus.OPEN)).toBe(false);
    });

    it('should NOT allow RESOLVED → IN_PROGRESS (backward)', () => {
      const status = CaseStatus.RESOLVED;
      expect(status.canTransitionTo(CaseStatus.IN_PROGRESS)).toBe(false);
    });

    it('should NOT allow CLOSED → any state', () => {
      const closed = CaseStatus.CLOSED;
      expect(closed.canTransitionTo(CaseStatus.OPEN)).toBe(false);
      expect(closed.canTransitionTo(CaseStatus.IN_PROGRESS)).toBe(false);
      expect(closed.canTransitionTo(CaseStatus.RESOLVED)).toBe(false);
    });
  });

  describe('transition()', () => {
    it('should return a new CaseStatus on valid transition', () => {
      const open = CaseStatus.OPEN;
      const inProgress = open.transition(CaseStatus.IN_PROGRESS);
      expect(inProgress.value).toBe(CaseStatus.IN_PROGRESS.value);
    });

    it('should throw on invalid transition', () => {
      const open = CaseStatus.OPEN;
      expect(() => open.transition(CaseStatus.RESOLVED)).toThrow();
    });
  });

  describe('isFinal()', () => {
    it('CLOSED should be a final state', () => {
      expect(CaseStatus.CLOSED.isFinal()).toBe(true);
    });

    it('RESOLVED should NOT be a final state (can still be closed)', () => {
      expect(CaseStatus.RESOLVED.isFinal()).toBe(false);
    });

    it('OPEN should NOT be a final state', () => {
      expect(CaseStatus.OPEN.isFinal()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should be equal to itself', () => {
      expect(CaseStatus.OPEN.equals(CaseStatus.OPEN)).toBe(true);
    });

    it('should not be equal to a different status', () => {
      expect(CaseStatus.OPEN.equals(CaseStatus.CLOSED)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the string representation', () => {
      expect(CaseStatus.OPEN.toString()).toBe('open');
    });
  });
});
