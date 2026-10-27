import { RefundRequest } from '../entities/RefundRequest.js';

export interface IRefundRepository {
  findById(id: string): Promise<RefundRequest | null>;
  findByCaseId(caseId: string): Promise<RefundRequest | null>;
  findByIdempotencyKey(key: string): Promise<RefundRequest | null>;
  findPending(): Promise<RefundRequest[]>;
  save(refund: RefundRequest): Promise<void>;
}
