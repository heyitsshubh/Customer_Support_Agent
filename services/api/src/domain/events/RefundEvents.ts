import { BaseDomainEvent } from './DomainEvent.js';

export class RefundRequestedEvent extends BaseDomainEvent {
  constructor(refundId: string, caseId: string, transactionId: string, amount: number, reason: string) {
    super('RefundRequested', refundId, { caseId, transactionId, amount, reason });
  }
}

export class RefundApprovedEvent extends BaseDomainEvent {
  constructor(refundId: string, approverId: string, amount: number) {
    super('RefundApproved', refundId, { approverId, amount });
  }
}

export class RefundRejectedEvent extends BaseDomainEvent {
  constructor(refundId: string, approverId: string, reason?: string) {
    super('RefundRejected', refundId, { approverId, reason });
  }
}
