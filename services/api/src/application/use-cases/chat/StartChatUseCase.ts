import { randomUUID } from 'node:crypto';
import { ICaseRepository } from '../../../domain/interfaces/ICaseRepository.js';
import { ICustomerRepository } from '../../../domain/interfaces/ICustomerRepository.js';
import { IAIAgentClient, AgentResponse } from '../../../infrastructure/http/AIAgentClient.js';
import { SupportCase } from '../../../domain/entities/SupportCase.js';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import { logger } from '../../../infrastructure/observability/logger.js';
import { metricsRegistry } from '../../../infrastructure/observability/metrics.js';

export interface StartChatInput {
  customerId: string;
  message: string;
  orderNumber?: string;
}

export interface ChatOutput {
  caseId: string;
  threadId: string;
  status: 'completed' | 'pending_approval' | 'error';
  response?: string;
  pendingAction?: {
    type: string;
    amount?: number;
    description: string;
  };
}

export class StartChatUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly aiAgentClient: IAIAgentClient
  ) {}

  async execute(input: StartChatInput): Promise<ChatOutput> {
    logger.info({ customerId: input.customerId }, 'Starting customer support chat session');

    // 1. Verify customer exists
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', input.customerId);
    }

    // 2. Initialize SupportCase Aggregate
    const caseId = randomUUID();
    const threadId = `thread_${randomUUID().replace(/-/g, '')}`;

    const supportCase = SupportCase.create(caseId, threadId, input.customerId);
    await this.caseRepository.save(supportCase);
    metricsRegistry.casesCreatedTotal.inc({ intent: 'initial' });

    // 3. Delegate execution to LangGraph AI Microservice
    const agentResponse: AgentResponse = await this.aiAgentClient.runAgent({
      thread_id: threadId,
      customer_id: input.customerId,
      message: input.message,
      context: {
        order_number: input.orderNumber,
      },
    });

    // 4. Update Case state in database based on LangGraph status
    if (agentResponse.status === 'pending_approval') {
      supportCase.setPendingApproval('billing_dispute');
      await this.caseRepository.save(supportCase);
      logger.info({ caseId, threadId }, 'Case suspended at approval gate awaiting supervisor review');
    }

    return {
      caseId,
      threadId,
      status: agentResponse.status,
      response: agentResponse.response,
      pendingAction: agentResponse.pending_action,
    };
  }
}
