import { Money } from '../value-objects/Money.js';
import { RefundStatus } from '../value-objects/RefundStatus.js';
import { RefundIneligibleError } from '../errors/DomainErrors.js';

export class RefundRequest {
  constructor(
    public readonly id: string,
    public readonly caseId: string,
    public readonly transactionId: string,
    public readonly amount: Money,
    public status: RefundStatus,
    public readonly idempotencyKey: string,
    public readonly reason: string,
    public approverId?: string,
    public approvedAt?: Date,
    public notes?: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public approve(approverId: string, notes?: string): void {
    if (!this.status.canTransitionTo(RefundStatus.APPROVED)) {
      throw new RefundIneligibleError(`Cannot approve refund in status '${this.status.value}'`);
    }
    this.status = RefundStatus.APPROVED;
    this.approverId = approverId;
    this.approvedAt = new Date();
    this.notes = notes;
    this.updatedAt = new Date();
  }

  public reject(approverId: string, reason?: string): void {
    if (!this.status.canTransitionTo(RefundStatus.REJECTED)) {
      throw new RefundIneligibleError(`Cannot reject refund in status '${this.status.value}'`);
    }
    this.status = RefundStatus.REJECTED;
    this.approverId = approverId;
    this.notes = reason;
    this.updatedAt = new Date();
  }

  public markExecuted(): void {
    if (!this.status.canTransitionTo(RefundStatus.EXECUTED)) {
      throw new RefundIneligibleError(`Cannot mark executed from status '${this.status.value}'`);
    }
    this.status = RefundStatus.EXECUTED;
    this.updatedAt = new Date();
  }
}
