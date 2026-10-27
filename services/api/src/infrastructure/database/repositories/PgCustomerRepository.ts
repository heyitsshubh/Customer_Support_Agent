import postgres from 'postgres';
import { ICustomerRepository } from '../../../domain/interfaces/ICustomerRepository.js';
import { Customer, CustomerTier } from '../../../domain/entities/Customer.js';
import { Email } from '../../../domain/value-objects/Email.js';
import { Money } from '../../../domain/value-objects/Money.js';

export class PgCustomerRepository implements ICustomerRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async findById(id: string): Promise<Customer | null> {
    const rows = await this.sql`
      SELECT id, email, name, tier, lifetime_value, created_at, updated_at
      FROM customers
      WHERE id = ${id}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const rows = await this.sql`
      SELECT id, email, name, tier, lifetime_value, created_at, updated_at
      FROM customers
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async save(customer: Customer): Promise<void> {
    await this.sql`
      INSERT INTO customers (id, email, name, tier, lifetime_value, created_at, updated_at)
      VALUES (
        ${customer.id},
        ${customer.email.value},
        ${customer.name},
        ${customer.tier},
        ${customer.lifetimeValue.amount},
        ${customer.createdAt},
        ${customer.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        tier = EXCLUDED.tier,
        lifetime_value = EXCLUDED.lifetime_value,
        updated_at = EXCLUDED.updated_at;
    `;
  }

  private mapToDomain(row: Record<string, unknown>): Customer {
    return new Customer(
      row.id as string,
      new Email(row.email as string),
      row.name as string,
      row.tier as CustomerTier,
      new Money(Number(row.lifetime_value)),
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    );
  }
}
