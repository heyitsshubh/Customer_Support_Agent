import { Email } from '../value-objects/Email.js';
import { Money } from '../value-objects/Money.js';

export type CustomerTier = 'standard' | 'silver' | 'gold';

export class Customer {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public name: string,
    public tier: CustomerTier,
    public lifetimeValue: Money,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  /**
   * Business rule: Gold and Silver tiers get higher refund discretion without manual review for low values (< $50).
   */
  public hasExpeditedRefundStatus(amount: Money): boolean {
    if (this.tier === 'gold') return true;
    if (this.tier === 'silver' && amount.amount <= 50.0) return true;
    return false;
  }

  /**
   * Business rule: Gold & Silver tiers get free return shipping.
   */
  public isEligibleForFreeReturnShipping(): boolean {
    return this.tier === 'gold' || this.tier === 'silver';
  }

  /**
   * SLA response target in minutes based on customer tier.
   */
  public getTargetSlaMinutes(): number {
    switch (this.tier) {
      case 'gold':
        return 15;
      case 'silver':
        return 60;
      case 'standard':
      default:
        return 240;
    }
  }
}
