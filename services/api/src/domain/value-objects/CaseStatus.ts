/**
 * Value Object: CaseStatus
 * Defines the lifecycle states of a customer support case and valid transitions.
 */
export type CaseStatusType = 'open' | 'pending_approval' | 'resolved' | 'closed';

export class CaseStatus {
  public static readonly OPEN = new CaseStatus('open');
  public static readonly PENDING_APPROVAL = new CaseStatus('pending_approval');
  public static readonly RESOLVED = new CaseStatus('resolved');
  public static readonly CLOSED = new CaseStatus('closed');

  private constructor(public readonly value: CaseStatusType) {}

  public static fromString(val: string): CaseStatus {
    switch (val.toLowerCase()) {
      case 'open':
        return CaseStatus.OPEN;
      case 'pending_approval':
        return CaseStatus.PENDING_APPROVAL;
      case 'resolved':
        return CaseStatus.RESOLVED;
      case 'closed':
        return CaseStatus.CLOSED;
      default:
        throw new Error(`Invalid CaseStatus: '${val}'`);
    }
  }

  public canTransitionTo(next: CaseStatus): boolean {
    if (this.value === next.value) return true;

    switch (this.value) {
      case 'open':
        return next.value === 'pending_approval' || next.value === 'resolved' || next.value === 'closed';
      case 'pending_approval':
        return next.value === 'open' || next.value === 'resolved' || next.value === 'closed';
      case 'resolved':
        return next.value === 'closed';
      case 'closed':
        return false; // Terminal state
      default:
        return false;
    }
  }

  public isOpen(): boolean {
    return this.value === 'open';
  }

  public isPendingApproval(): boolean {
    return this.value === 'pending_approval';
  }

  public isTerminal(): boolean {
    return this.value === 'closed';
  }
}
