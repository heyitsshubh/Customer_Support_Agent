/**
 * Unit tests for SupportCase aggregate root.
 * Tests domain events, status transitions, and lifecycle invariants.
 */

import { SupportCase } from '../../../../src/domain/entities/SupportCase';
import { CaseStatus } from '../../../../src/domain/value-objects/CaseStatus';
import { Money } from '../../../../src/domain/value-objects/Money';
import {
  CaseCreatedEvent,
  CaseStatusChangedEvent,
  CaseResolvedEvent,
} from '../../../../src/domain/events/CaseEvents';

describe('SupportCase', () => {
  function makeCase(overrides: Partial<{
    id: string;
    customerId: string;
    subject: string;
    description: string;
    priority: string;
  }> = {}): SupportCase {
    return SupportCase.create({
      id: overrides.id ?? 'case-001',
      customerId: overrides.customerId ?? 'customer-001',
      subject: overrides.subject ?? 'Duplicate charge on order ORD-1042',
      description: overrides.description ?? 'I was charged twice for my order.',
      priority: overrides.priority ?? 'high',
    });
  }

  describe('create()', () => {
    it('should create a SupportCase with OPEN status', () => {
      const sc = makeCase();
      expect(sc.status.equals(CaseStatus.OPEN)).toBe(true);
    });

    it('should emit a CaseCreatedEvent on creation', () => {
      const sc = makeCase();
      const events = sc.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(CaseCreatedEvent);
    });

    it('should set the correct customerId', () => {
      const sc = makeCase({ customerId: 'customer-xyz' });
      expect(sc.customerId).toBe('customer-xyz');
    });
  });

  describe('assignAgent()', () => {
    it('should transition to IN_PROGRESS when an agent is assigned', () => {
      const sc = makeCase();
      sc.clearEvents();
      sc.assignAgent('agent-001');
      expect(sc.status.equals(CaseStatus.IN_PROGRESS)).toBe(true);
    });

    it('should emit a CaseStatusChangedEvent when assigned', () => {
      const sc = makeCase();
      sc.clearEvents();
      sc.assignAgent('agent-001');
      const events = sc.domainEvents;
      const statusEvent = events.find(e => e instanceof CaseStatusChangedEvent);
      expect(statusEvent).toBeDefined();
    });

    it('should set the assignedAgentId', () => {
      const sc = makeCase();
      sc.assignAgent('agent-007');
      expect(sc.assignedAgentId).toBe('agent-007');
    });
  });

  describe('requestApproval()', () => {
    it('should transition to PENDING_APPROVAL', () => {
      const sc = makeCase();
      sc.assignAgent('agent-001');
      sc.clearEvents();
      sc.requestApproval();
      expect(sc.status.equals(CaseStatus.PENDING_APPROVAL)).toBe(true);
    });

    it('should throw if case is not IN_PROGRESS', () => {
      const sc = makeCase(); // OPEN state
      expect(() => sc.requestApproval()).toThrow();
    });
  });

  describe('resolve()', () => {
    it('should transition to RESOLVED from IN_PROGRESS', () => {
      const sc = makeCase();
      sc.assignAgent('agent-001');
      sc.clearEvents();
      sc.resolve('Issue resolved via refund.');
      expect(sc.status.equals(CaseStatus.RESOLVED)).toBe(true);
    });

    it('should emit CaseResolvedEvent on resolve', () => {
      const sc = makeCase();
      sc.assignAgent('agent-001');
      sc.clearEvents();
      sc.resolve('Resolved.');
      const events = sc.domainEvents;
      expect(events.some(e => e instanceof CaseResolvedEvent)).toBe(true);
    });

    it('should store the resolution note', () => {
      const sc = makeCase();
      sc.assignAgent('agent-001');
      sc.resolve('Customer refunded \$89.99.');
      expect(sc.resolutionNote).toBe('Customer refunded \$89.99.');
    });

    it('should resolve from PENDING_APPROVAL state', () => {
      const sc = makeCase();
      sc.assignAgent('agent-001');
      sc.requestApproval();
      sc.clearEvents();
      sc.resolve('Approved and resolved.');
      expect(sc.status.equals(CaseStatus.RESOLVED)).toBe(true);
    });
  });

  describe('close()', () => {
    it('should transition to CLOSED from RESOLVED', () => {
      const sc = makeCase();
      sc.assignAgent('agent-001');
      sc.resolve('Resolved.');
      sc.clearEvents();
      sc.close();
      expect(sc.status.equals(CaseStatus.CLOSED)).toBe(true);
    });

    it('should throw if trying to close an OPEN case directly', () => {
      const sc = makeCase();
      expect(() => sc.close()).toThrow();
    });
  });

  describe('escalate()', () => {
    it('should transition to ESCALATED from OPEN', () => {
      const sc = makeCase();
      sc.escalate('Needs senior review.');
      expect(sc.status.equals(CaseStatus.ESCALATED)).toBe(true);
    });

    it('should emit a CaseStatusChangedEvent on escalation', () => {
      const sc = makeCase();
      sc.clearEvents();
      sc.escalate('Critical issue.');
      expect(sc.domainEvents.some(e => e instanceof CaseStatusChangedEvent)).toBe(true);
    });
  });

  describe('domain events management', () => {
    it('clearEvents() should remove all domain events', () => {
      const sc = makeCase();
      expect(sc.domainEvents.length).toBeGreaterThan(0);
      sc.clearEvents();
      expect(sc.domainEvents).toHaveLength(0);
    });

    it('should accumulate multiple events across lifecycle', () => {
      const sc = makeCase();  // CaseCreatedEvent
      sc.assignAgent('agent-001'); // CaseStatusChangedEvent
      sc.resolve('Done.'); // CaseStatusChangedEvent + CaseResolvedEvent
      expect(sc.domainEvents.length).toBeGreaterThanOrEqual(3);
    });
  });
});
