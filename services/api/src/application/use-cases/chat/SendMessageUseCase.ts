import { ICaseRepository } from '../../../domain/interfaces/ICaseRepository.js';
import { IAIAgentClient, AgentResponse } from '../../../infrastructure/http/AIAgentClient.js';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import { logger } from '../../../infrastructure/observability/logger.js';
import { ChatOutput } from './StartChatUseCase.js';

export interface SendMessageInput {
  threadId: string;
  message: string;
}

export class SendMessageUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly aiAgentClient: IAIAgentClient
  ) {}

  async execute(input: SendMessageInput): Promise<ChatOutput> {
    logger.info({ threadId: input.threadId }, 'Continuing support conversation message');

    // 1. Locate case
    const supportCase = await this.caseRepository.findByThreadId(input.threadId);
    if (!supportCase) {
      throw new NotFoundError('SupportCase for thread', input.threadId);
    }

    // 2. Invoke AI Agent
    const agentResponse: AgentResponse = await this.aiAgentClient.runAgent({
      thread_id: input.threadId,
      customer_id: supportCase.customerId,
      message: input.message,
    });

    // 3. Update case state if paused for approval
    if (agentResponse.status === 'pending_approval') {
      supportCase.setPendingApproval('billing_dispute');
      await this.caseRepository.save(supportCase);
    }

    return {
      caseId: supportCase.id,
      threadId: input.threadId,
      status: agentResponse.status,
      response: agentResponse.response,
      pendingAction: agentResponse.pending_action,
    };
  }
}
