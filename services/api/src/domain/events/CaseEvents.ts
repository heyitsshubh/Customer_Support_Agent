import { BaseDomainEvent } from './DomainEvent.js';

export class CaseCreatedEvent extends BaseDomainEvent {
  constructor(caseId: string, customerId: string, threadId: string) {
    super('CaseCreated', caseId, { customerId, threadId });
  }
}

export class CaseStatusChangedEvent extends BaseDomainEvent {
  constructor(caseId: string, oldStatus: string, newStatus: string) {
    super('CaseStatusChanged', caseId, { oldStatus, newStatus });
  }
}

export class CaseResolvedEvent extends BaseDomainEvent {
  constructor(caseId: string, customerId: string, resolutionNotes: string) {
    super('CaseResolved', caseId, { customerId, resolutionNotes });
  }
}
