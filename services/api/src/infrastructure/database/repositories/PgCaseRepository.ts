import postgres from 'postgres';
import { ICaseRepository, CaseFilterOptions } from '../../../domain/interfaces/ICaseRepository.js';
import { SupportCase, CasePriority } from '../../../domain/entities/SupportCase.js';
import { CaseStatus } from '../../../domain/value-objects/CaseStatus.js';

export class PgCaseRepository implements ICaseRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async findById(id: string): Promise<SupportCase | null> {
    const rows = await this.sql`
      SELECT id, thread_id, customer_id, status, priority, intent, summary, 
             assigned_to, resolution_notes, created_at, resolved_at, updated_at
      FROM support_cases
      WHERE id = ${id}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async findByThreadId(threadId: string): Promise<SupportCase | null> {
    const rows = await this.sql`
      SELECT id, thread_id, customer_id, status, priority, intent, summary, 
             assigned_to, resolution_notes, created_at, resolved_at, updated_at
      FROM support_cases
      WHERE thread_id = ${threadId}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async findPendingApproval(limit = 20): Promise<SupportCase[]> {
    const rows = await this.sql`
      SELECT id, thread_id, customer_id, status, priority, intent, summary, 
             assigned_to, resolution_notes, created_at, resolved_at, updated_at
      FROM support_cases
      WHERE status = 'pending_approval'
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    return rows.map((r) => this.mapToDomain(r));
  }

  async findMany(options: CaseFilterOptions): Promise<SupportCase[]> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const rows = await this.sql`
      SELECT id, thread_id, customer_id, status, priority, intent, summary, 
             assigned_to, resolution_notes, created_at, resolved_at, updated_at
      FROM support_cases
      WHERE (${options.status ? this.sql`status = ${options.status}` : this.sql`TRUE`})
        AND (${options.priority ? this.sql`priority = ${options.priority}` : this.sql`TRUE`})
        AND (${options.customerId ? this.sql`customer_id = ${options.customerId}` : this.sql`TRUE`})
        AND (${options.assignedTo ? this.sql`assigned_to = ${options.assignedTo}` : this.sql`TRUE`})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    return rows.map((r) => this.mapToDomain(r));
  }

  async count(options: CaseFilterOptions): Promise<number> {
    const [result] = await this.sql`
      SELECT COUNT(*)::int as total
      FROM support_cases
      WHERE (${options.status ? this.sql`status = ${options.status}` : this.sql`TRUE`})
        AND (${options.priority ? this.sql`priority = ${options.priority}` : this.sql`TRUE`})
        AND (${options.customerId ? this.sql`customer_id = ${options.customerId}` : this.sql`TRUE`})
        AND (${options.assignedTo ? this.sql`assigned_to = ${options.assignedTo}` : this.sql`TRUE`});
    `;
    return result ? Number(result.total) : 0;
  }

  async save(supportCase: SupportCase): Promise<void> {
    await this.sql`
      INSERT INTO support_cases (
        id, thread_id, customer_id, status, priority, intent, summary, 
        assigned_to, resolution_notes, created_at, resolved_at, updated_at
      ) VALUES (
        ${supportCase.id},
        ${supportCase.threadId},
        ${supportCase.customerId},
        ${supportCase.status.value},
        ${supportCase.priority},
        ${supportCase.intent || null},
        ${supportCase.summary || null},
        ${supportCase.assignedTo || null},
        ${supportCase.resolutionNotes || null},
        ${supportCase.createdAt},
        ${supportCase.resolvedAt || null},
        ${supportCase.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        intent = EXCLUDED.intent,
        summary = EXCLUDED.summary,
        assigned_to = EXCLUDED.assigned_to,
        resolution_notes = EXCLUDED.resolution_notes,
        resolved_at = EXCLUDED.resolved_at,
        updated_at = EXCLUDED.updated_at;
    `;
  }

  private mapToDomain(row: Record<string, unknown>): SupportCase {
    return new SupportCase(
      row.id as string,
      row.thread_id as string,
      row.customer_id as string,
      CaseStatus.fromString(row.status as string),
      row.priority as CasePriority,
      row.intent as string | undefined,
      row.summary as string | undefined,
      row.assigned_to as string | undefined,
      row.resolution_notes as string | undefined,
      new Date(row.created_at as string),
      row.resolved_at ? new Date(row.resolved_at as string) : undefined,
      new Date(row.updated_at as string)
    );
  }
}
