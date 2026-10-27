import { CaseStatus } from '../value-objects/CaseStatus.js';
import { IDomainEvent } from '../events/DomainEvent.js';
import { CaseCreatedEvent, CaseStatusChangedEvent, CaseResolvedEvent } from '../events/CaseEvents.js';
import { CaseNotPendingApprovalError } from '../errors/DomainErrors.js';

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';

export class SupportCase {
  private _domainEvents: IDomainEvent[] = [];

  constructor(
    public readonly id: string,
    public readonly threadId: string,
    public readonly customerId: string,
    public status: CaseStatus,
    public priority: CasePriority = 'medium',
    public intent?: string,
    public summary?: string,
    public assignedTo?: string,
    public resolutionNotes?: string,
    public readonly createdAt: Date = new Date(),
    public resolvedAt?: Date,
    public updatedAt: Date = new Date()
  ) {}

  public static create(id: string, threadId: string, customerId: string, priority: CasePriority = 'medium'): SupportCase {
    const supportCase = new SupportCase(id, threadId, customerId, CaseStatus.OPEN, priority);
    supportCase.recordEvent(new CaseCreatedEvent(id, customerId, threadId));
    return supportCase;
  }

  public setPendingApproval(intent?: string): void {
    if (!this.status.canTransitionTo(CaseStatus.PENDING_APPROVAL)) {
      throw new Error(`Cannot transition case '${this.id}' from '${this.status.value}' to pending_approval`);
    }
    const oldStatus = this.status.value;
    this.status = CaseStatus.PENDING_APPROVAL;
    if (intent) this.intent = intent;
    this.updatedAt = new Date();
    this.recordEvent(new CaseStatusChangedEvent(this.id, oldStatus, this.status.value));
  }

  public resolve(notes: string): void {
    const oldStatus = this.status.value;
    if (!this.status.canTransitionTo(CaseStatus.RESOLVED)) {
      throw new Error(`Cannot resolve case '${this.id}' in status '${this.status.value}'`);
    }
    this.status = CaseStatus.RESOLVED;
    this.resolutionNotes = notes;
    this.resolvedAt = new Date();
    this.updatedAt = new Date();
    this.recordEvent(new CaseStatusChangedEvent(this.id, oldStatus, this.status.value));
    this.recordEvent(new CaseResolvedEvent(this.id, this.customerId, notes));
  }

  public close(): void {
    const oldStatus = this.status.value;
    if (!this.status.canTransitionTo(CaseStatus.CLOSED)) {
      throw new Error(`Cannot close case '${this.id}' in status '${this.status.value}'`);
    }
    this.status = CaseStatus.CLOSED;
    this.updatedAt = new Date();
    this.recordEvent(new CaseStatusChangedEvent(this.id, oldStatus, this.status.value));
  }

  public assignTo(userId: string): void {
    this.assignedTo = userId;
    this.updatedAt = new Date();
  }

  public setPriority(priority: CasePriority): void {
    this.priority = priority;
    this.updatedAt = new Date();
  }

  // --- Aggregate Root Domain Events ---

  public pullDomainEvents(): IDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  private recordEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }
}
