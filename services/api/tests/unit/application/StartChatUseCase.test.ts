/**
 * Unit tests for StartChatUseCase.
 * Verifies chat thread creation, AI agent invocation, and error handling.
 */

import { StartChatUseCase } from '../../../../src/application/use-cases/chat/StartChatUseCase';

// --- Mock factories ---
function makeMockCaseRepository() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByCustomerId: jest.fn(),
    findPendingApproval: jest.fn(),
    update: jest.fn(),
  };
}

function makeMockCustomerRepository() {
  return {
    findById: jest.fn().mockResolvedValue({
      id: 'customer-001',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      tier: 'premium',
    }),
    findByEmail: jest.fn(),
    save: jest.fn(),
  };
}

function makeMockAIAgentClient() {
  return {
    runAgent: jest.fn().mockResolvedValue({
      threadId: 'thread-abc-123',
      status: 'completed',
      response: 'Thank you for reaching out. I see you have a duplicate charge issue.',
      requiresApproval: false,
      pendingAction: null,
    }),
    resumeAgent: jest.fn(),
    getAgentState: jest.fn(),
  };
}

function makeMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('StartChatUseCase', () => {
  let caseRepository: ReturnType<typeof makeMockCaseRepository>;
  let customerRepository: ReturnType<typeof makeMockCustomerRepository>;
  let aiAgentClient: ReturnType<typeof makeMockAIAgentClient>;
  let logger: ReturnType<typeof makeMockLogger>;
  let useCase: StartChatUseCase;

  beforeEach(() => {
    caseRepository = makeMockCaseRepository();
    customerRepository = makeMockCustomerRepository();
    aiAgentClient = makeMockAIAgentClient();
    logger = makeMockLogger();

    useCase = new StartChatUseCase({
      caseRepository,
      customerRepository,
      aiAgentClient,
      logger,
    });
  });

  describe('execute()', () => {
    const validInput = {
      customerId: 'customer-001',
      message: 'I was charged twice for my order ORD-1042.',
    };

    it('should create a support case and return threadId', async () => {
      const result = await useCase.execute(validInput);
      expect(result.threadId).toBe('thread-abc-123');
      expect(result.caseId).toBeDefined();
    });

    it('should persist the support case via repository', async () => {
      await useCase.execute(validInput);
      expect(caseRepository.save).toHaveBeenCalledTimes(1);
      const savedCase = caseRepository.save.mock.calls[0][0];
      expect(savedCase.customerId).toBe('customer-001');
    });

    it('should call the AI agent with customer context', async () => {
      await useCase.execute(validInput);
      expect(aiAgentClient.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-001',
          message: validInput.message,
        })
      );
    });

    it('should include agent response in the result', async () => {
      const result = await useCase.execute(validInput);
      expect(result.response).toContain('duplicate charge');
    });

    it('should return requiresApproval: false when AI resolves directly', async () => {
      const result = await useCase.execute(validInput);
      expect(result.requiresApproval).toBe(false);
    });

    it('should return requiresApproval: true when AI needs human approval', async () => {
      aiAgentClient.runAgent.mockResolvedValueOnce({
        threadId: 'thread-needs-approval',
        status: 'pending_approval',
        response: 'I need a supervisor to approve this \$89.99 refund.',
        requiresApproval: true,
        pendingAction: { type: 'refund', amount: 89.99, currency: 'USD' },
      });

      const result = await useCase.execute(validInput);
      expect(result.requiresApproval).toBe(true);
      expect(result.pendingAction).toBeDefined();
    });

    it('should throw NotFoundError if customer does not exist', async () => {
      customerRepository.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute(validInput)).rejects.toThrow(/not found/i);
    });

    it('should throw AIServiceUnavailableError if AI agent call fails', async () => {
      aiAgentClient.runAgent.mockRejectedValueOnce(new Error('Circuit breaker open'));
      await expect(useCase.execute(validInput)).rejects.toThrow(/unavailable|circuit/i);
    });

    it('should log the start of chat', async () => {
      await useCase.execute(validInput);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'customer-001' }),
        expect.stringContaining('chat')
      );
    });
  });
});
