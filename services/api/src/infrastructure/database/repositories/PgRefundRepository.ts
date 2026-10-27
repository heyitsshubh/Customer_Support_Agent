import postgres from 'postgres';
import { IRefundRepository } from '../../../domain/interfaces/IRefundRepository.js';
import { RefundRequest } from '../../../domain/entities/RefundRequest.js';
import { RefundStatus } from '../../../domain/value-objects/RefundStatus.js';
import { Money } from '../../../domain/value-objects/Money.js';

export class PgRefundRepository implements IRefundRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async findById(id: string): Promise<RefundRequest | null> {
    const rows = await this.sql`
      SELECT id, case_id, transaction_id, amount, status, idempotency_key, 
             approver_id, approved_at, reason, notes, created_at, updated_at
      FROM refund_requests
      WHERE id = ${id}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async findByCaseId(caseId: string): Promise<RefundRequest | null> {
    const rows = await this.sql`
      SELECT id, case_id, transaction_id, amount, status, idempotency_key, 
             approver_id, approved_at, reason, notes, created_at, updated_at
      FROM refund_requests
      WHERE case_id = ${caseId}
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async findByIdempotencyKey(key: string): Promise<RefundRequest | null> {
    const rows = await this.sql`
      SELECT id, case_id, transaction_id, amount, status, idempotency_key, 
             approver_id, approved_at, reason, notes, created_at, updated_at
      FROM refund_requests
      WHERE idempotency_key = ${key}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async findPending(): Promise<RefundRequest[]> {
    const rows = await this.sql`
      SELECT id, case_id, transaction_id, amount, status, idempotency_key, 
             approver_id, approved_at, reason, notes, created_at, updated_at
      FROM refund_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC;
    `;
    return rows.map((r) => this.mapToDomain(r));
  }

  async save(refund: RefundRequest): Promise<void> {
    await this.sql`
      INSERT INTO refund_requests (
        id, case_id, transaction_id, amount, status, idempotency_key,
        approver_id, approved_at, reason, notes, created_at, updated_at
      ) VALUES (
        ${refund.id},
        ${refund.caseId},
        ${refund.transactionId},
        ${refund.amount.amount},
        ${refund.status.value},
        ${refund.idempotencyKey},
        ${refund.approverId || null},
        ${refund.approvedAt || null},
        ${refund.reason},
        ${refund.notes || null},
        ${refund.createdAt},
        ${refund.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        approver_id = EXCLUDED.approver_id,
        approved_at = EXCLUDED.approved_at,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at;
    `;
  }

  private mapToDomain(row: Record<string, unknown>): RefundRequest {
    return new RefundRequest(
      row.id as string,
      row.case_id as string,
      row.transaction_id as string,
      new Money(Number(row.amount)),
      RefundStatus.fromString(row.status as string),
      row.idempotency_key as string,
      row.reason as string,
      row.approver_id as string | undefined,
      row.approved_at ? new Date(row.approved_at as string) : undefined,
      row.notes as string | undefined,
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    );
  }
}
