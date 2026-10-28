import { ICaseRepository } from '../../../domain/interfaces/ICaseRepository.js';
import { IRefundRepository } from '../../../domain/interfaces/IRefundRepository.js';
import { IAIAgentClient } from '../../../infrastructure/http/AIAgentClient.js';
import { NotFoundError, CaseNotPendingApprovalError } from '../../../domain/errors/DomainErrors.js';
import { logger } from '../../../infrastructure/observability/logger.js';
import { metricsRegistry } from '../../../infrastructure/observability/metrics.js';

export interface ApproveCaseInput {
  threadId: string;
  approved: boolean;
  approverId: string;
  notes?: string;
}

export interface ApproveCaseOutput {
  caseId: string;
  threadId: string;
  status: string;
  decision: 'approved' | 'rejected';
  response?: string;
}

export class ApproveCaseUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly refundRepository: IRefundRepository,
    private readonly aiAgentClient: IAIAgentClient
  ) {}

  async execute(input: ApproveCaseInput): Promise<ApproveCaseOutput> {
    logger.info({ threadId: input.threadId, approved: input.approved, approverId: input.approverId }, 'Processing case supervisor approval');

    // 1. Locate case
    const supportCase = await this.caseRepository.findByThreadId(input.threadId);
    if (!supportCase) {
      throw new NotFoundError('SupportCase for thread', input.threadId);
    }

    // 2. Validate case is in pending_approval status
    if (!supportCase.status.isPendingApproval()) {
      throw new CaseNotPendingApprovalError(supportCase.id);
    }

    // 3. Resume LangGraph workflow using Command(resume=...) via AIAgentClient
    const agentResponse = await this.aiAgentClient.resumeAgent({
      thread_id: input.threadId,
      approved: input.approved,
      approver_id: input.approverId,
      notes: input.notes,
    });

    // 4. Update Case Aggregate status
    if (input.approved) {
      supportCase.resolve(input.notes || 'Refund approved by supervisor and disbursed to original payment method.');
      metricsRegistry.casesResolvedTotal.inc({ resolution_type: 'refund_approved' });
      metricsRegistry.refundRequestsTotal.inc({ status: 'approved' });
    } else {
      supportCase.setPriority('high');
      metricsRegistry.refundRequestsTotal.inc({ status: 'rejected' });
    }

    await this.caseRepository.save(supportCase);

    return {
      caseId: supportCase.id,
      threadId: input.threadId,
      status: supportCase.status.value,
      decision: input.approved ? 'approved' : 'rejected',
      response: agentResponse.response,
    };
  }
}
