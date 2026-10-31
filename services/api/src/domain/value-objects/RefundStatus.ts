/**
 * Value Object: RefundStatus
 * State machine for financial refund requests.
 */
export type RefundStatusType = 'pending' | 'approved' | 'rejected' | 'executed';

export class RefundStatus {
  public static readonly PENDING = new RefundStatus('pending');
  public static readonly APPROVED = new RefundStatus('approved');
  public static readonly REJECTED = new RefundStatus('rejected');
  public static readonly EXECUTED = new RefundStatus('executed');

  private constructor(public readonly value: RefundStatusType) {}

  public static fromString(val: string): RefundStatus {
    switch (val.toLowerCase()) {
      case 'pending':
        return RefundStatus.PENDING;
      case 'approved':
        return RefundStatus.APPROVED;
      case 'rejected':
        return RefundStatus.REJECTED;
      case 'executed':
        return RefundStatus.EXECUTED;
      default:
        throw new Error(`Invalid RefundStatus: '${val}'`);
    }
  }

  public canTransitionTo(next: RefundStatus): boolean {
    if (this.value === next.value) return true;

    switch (this.value) {
      case 'pending':
        return next.value === 'approved' || next.value === 'rejected';
      case 'approved':
        return next.value === 'executed';
      case 'rejected':
      case 'executed':
        return false; // Terminal states
      default:
        return false;
    }
  }

  public isPending(): boolean {
    return this.value === 'pending';
  }

  public isTerminal(): boolean {
    return this.value === 'rejected' || this.value === 'executed';
  }
}
