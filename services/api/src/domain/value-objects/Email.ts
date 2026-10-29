/**
 * Value Object: Email
 * Validates format and normalizes email addresses.
 */
export class Email {
  public readonly value: string;

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(email: string) {
    if (!email || !Email.EMAIL_REGEX.test(email.trim())) {
      throw new Error(`Invalid email address format: '${email}'`);
    }
    this.value = email.trim().toLowerCase();
  }

  public equals(other: Email): boolean {
    return this.value === other.value;
  }

  public getDomain(): string {
    return this.value.split('@')[1];
  }

  public toString(): string {
    return this.value;
  }
}
