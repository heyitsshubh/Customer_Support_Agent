import { SupportCase } from '../entities/SupportCase.js';

export interface CaseFilterOptions {
  status?: string;
  priority?: string;
  customerId?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface ICaseRepository {
  findById(id: string): Promise<SupportCase | null>;
  findByThreadId(threadId: string): Promise<SupportCase | null>;
  findPendingApproval(limit?: number): Promise<SupportCase[]>;
  findMany(options: CaseFilterOptions): Promise<SupportCase[]>;
  save(supportCase: SupportCase): Promise<void>;
  count(options: CaseFilterOptions): Promise<number>;
}
