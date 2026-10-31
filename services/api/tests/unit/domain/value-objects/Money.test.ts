/**
 * Unit tests for Money value object.
 * Tests arithmetic operations, currency mismatch errors, and formatting.
 */

import { Money } from '../../../../src/domain/value-objects/Money';

describe('Money', () => {
  describe('construction', () => {
    it('should create a Money instance with amount and currency', () => {
      const money = new Money(100, 'USD');
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should round amount to 2 decimal places', () => {
      const money = new Money(10.1234567, 'USD');
      expect(money.amount).toBeCloseTo(10.12, 2);
    });

    it('should throw if amount is negative', () => {
      expect(() => new Money(-1, 'USD')).toThrow();
    });

    it('should allow zero amount', () => {
      const money = new Money(0, 'USD');
      expect(money.amount).toBe(0);
    });
  });

  describe('add()', () => {
    it('should add two Money values of the same currency', () => {
      const a = new Money(10, 'USD');
      const b = new Money(5, 'USD');
      expect(a.add(b).amount).toBeCloseTo(15, 2);
    });

    it('should throw when adding different currencies', () => {
      const usd = new Money(10, 'USD');
      const eur = new Money(5, 'EUR');
      expect(() => usd.add(eur)).toThrow(/currency/i);
    });

    it('should return a new Money instance (immutability)', () => {
      const a = new Money(10, 'USD');
      const b = new Money(5, 'USD');
      const result = a.add(b);
      expect(result).not.toBe(a);
      expect(a.amount).toBe(10);
    });
  });

  describe('subtract()', () => {
    it('should subtract two Money values of the same currency', () => {
      const a = new Money(10, 'USD');
      const b = new Money(4, 'USD');
      expect(a.subtract(b).amount).toBeCloseTo(6, 2);
    });

    it('should throw when result would be negative', () => {
      const a = new Money(5, 'USD');
      const b = new Money(10, 'USD');
      expect(() => a.subtract(b)).toThrow();
    });

    it('should throw when subtracting different currencies', () => {
      const usd = new Money(10, 'USD');
      const eur = new Money(5, 'EUR');
      expect(() => usd.subtract(eur)).toThrow(/currency/i);
    });
  });

  describe('equals()', () => {
    it('should return true for same amount and currency', () => {
      const a = new Money(100, 'USD');
      const b = new Money(100, 'USD');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different amount', () => {
      const a = new Money(100, 'USD');
      const b = new Money(50, 'USD');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different currency', () => {
      const a = new Money(100, 'USD');
      const b = new Money(100, 'EUR');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('isGreaterThan()', () => {
    it('should return true when amount is greater', () => {
      const a = new Money(100, 'USD');
      const b = new Money(50, 'USD');
      expect(a.isGreaterThan(b)).toBe(true);
    });

    it('should return false when amount is equal', () => {
      const a = new Money(100, 'USD');
      const b = new Money(100, 'USD');
      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should return false when amount is less', () => {
      const a = new Money(50, 'USD');
      const b = new Money(100, 'USD');
      expect(a.isGreaterThan(b)).toBe(false);
    });
  });

  describe('toFormatted()', () => {
    it('should format USD correctly', () => {
      const money = new Money(1234.56, 'USD');
      const formatted = money.toFormatted();
      expect(formatted).toContain('1,234.56');
    });

    it('should include currency symbol', () => {
      const money = new Money(100, 'USD');
      const formatted = money.toFormatted();
      expect(formatted).toMatch(/\$|USD/);
    });
  });

  describe('toJSON()', () => {
    it('should serialize to plain object', () => {
      const money = new Money(99.99, 'USD');
      const json = money.toJSON();
      expect(json).toEqual({ amount: 99.99, currency: 'USD' });
    });
  });
});
