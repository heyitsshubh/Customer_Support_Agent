/**
 * Value Object: Money
 * Implements immutable monetary logic with scale precision and currency checks.
 */
export class Money {
  public readonly amount: number;
  public readonly currency: string;

  constructor(amount: number, currency = 'USD') {
    if (isNaN(amount)) {
      throw new Error('Money amount must be a valid number');
    }
    // Round to 2 decimal places to prevent floating-point drift
    this.amount = Math.round(amount * 100) / 100;
    this.currency = currency.toUpperCase();
  }

  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  public isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  public equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  public isZero(): boolean {
    return this.amount === 0;
  }

  public isPositive(): boolean {
    return this.amount > 0;
  }

  public toFormatted(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate on ${this.currency} and ${other.currency}`);
    }
  }
}
