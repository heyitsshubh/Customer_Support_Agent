/**
 * Unit tests for ApproveCaseUseCase.
 * Verifies approval workflow, error scenarios, and repository interactions.
 */

import { ApproveCaseUseCase } from '../../../../src/application/use-cases/chat/ApproveCaseUseCase';
import { CaseNotPendingApprovalError } from '../../../../src/domain/errors/DomainErrors';

// --- Mock factories ---
function makeMockCaseRepository(caseOverrides: Record<string, unknown> = {}) {
  const defaultCase = {
    id: 'case-001',
    customerId: 'customer-001',
    status: { value: 'pending_approval', equals: (s: { value: string }) => s.value === 'pending_approval', isFinal: () => false },
    assignedAgentId: 'agent-001',
    assignAgent: jest.fn(),
    requestApproval: jest.fn(),
    resolve: jest.fn(),
    close: jest.fn(),
    clearEvents: jest.fn(),
    domainEvents: [],
    ...caseOverrides,
  };
  return {
    findById: jest.fn().mockResolvedValue(defaultCase),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findPendingApproval: jest.fn(),
    _defaultCase: defaultCase,
  };
}

function makeMockRefundRepository() {
  return {
    findByCaseId: jest.fn().mockResolvedValue({
      id: 'refund-001',
      caseId: 'case-001',
      amount: { amount: 89.99, currency: 'USD' },
      status: { value: 'pending' },
      approve: jest.fn(),
      reject: jest.fn(),
      execute: jest.fn(),
    }),
    save: jest.fn(),
    update: jest.fn(),
  };
}

function makeMockAIAgentClient() {
  return {
    resumeAgent: jest.fn().mockResolvedValue({
      status: 'completed',
      response: 'Refund of \$89.99 has been processed successfully.',
    }),
    runAgent: jest.fn(),
    getAgentState: jest.fn(),
  };
}

function makeMockLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

describe('ApproveCaseUseCase', () => {
  let caseRepository: ReturnType<typeof makeMockCaseRepository>;
  let refundRepository: ReturnType<typeof makeMockRefundRepository>;
  let aiAgentClient: ReturnType<typeof makeMockAIAgentClient>;
  let logger: ReturnType<typeof makeMockLogger>;
  let useCase: ApproveCaseUseCase;

  beforeEach(() => {
    caseRepository = makeMockCaseRepository();
    refundRepository = makeMockRefundRepository();
    aiAgentClient = makeMockAIAgentClient();
    logger = makeMockLogger();

    useCase = new ApproveCaseUseCase({
      caseRepository,
      refundRepository,
      aiAgentClient,
      logger,
    });
  });

  const validInput = {
    caseId: 'case-001',
    threadId: 'thread-abc-123',
    approverId: 'supervisor-001',
    approved: true,
    notes: 'Duplicate charge verified. Approved.',
  };

  describe('execute() — approval path', () => {
    it('should resolve successfully when case is PENDING_APPROVAL and approved=true', async () => {
      const result = await useCase.execute(validInput);
      expect(result.success).toBe(true);
    });

    it('should resume the AI agent with approved=true', async () => {
      await useCase.execute(validInput);
      expect(aiAgentClient.resumeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-abc-123',
          approved: true,
          approverId: 'supervisor-001',
        })
      );
    });

    it('should include the agent response in the result', async () => {
      const result = await useCase.execute(validInput);
      expect(result.response).toContain('\$89.99');
    });

    it('should persist the case update', async () => {
      await useCase.execute(validInput);
      expect(caseRepository.update).toHaveBeenCalled();
    });

    it('should log the approval action', async () => {
      await useCase.execute(validInput);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-001',
          approverId: 'supervisor-001',
          approved: true,
        }),
        expect.any(String)
      );
    });
  });

  describe('execute() — rejection path', () => {
    it('should resolve successfully when approved=false', async () => {
      aiAgentClient.resumeAgent.mockResolvedValueOnce({
        status: 'completed',
        response: 'Your refund request has been declined. Please contact support.',
      });
      const result = await useCase.execute({ ...validInput, approved: false, notes: 'Not eligible per policy.' });
      expect(result.success).toBe(true);
    });

    it('should resume agent with approved=false', async () => {
      await useCase.execute({ ...validInput, approved: false });
      expect(aiAgentClient.resumeAgent).toHaveBeenCalledWith(
        expect.objectContaining({ approved: false })
      );
    });
  });

  describe('execute() — CaseNotPendingApprovalError', () => {
    it('should throw CaseNotPendingApprovalError when case is not PENDING_APPROVAL', async () => {
      caseRepository = makeMockCaseRepository({
        status: {
          value: 'open',
          equals: (s: { value: string }) => s.value === 'open',
          isFinal: () => false,
        },
      });
      useCase = new ApproveCaseUseCase({
        caseRepository,
        refundRepository,
        aiAgentClient,
        logger,
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(CaseNotPendingApprovalError);
    });

    it('should throw CaseNotPendingApprovalError for a CLOSED case', async () => {
      caseRepository = makeMockCaseRepository({
        status: {
          value: 'closed',
          equals: (s: { value: string }) => s.value === 'closed',
          isFinal: () => true,
        },
      });
      useCase = new ApproveCaseUseCase({
        caseRepository,
        refundRepository,
        aiAgentClient,
        logger,
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(CaseNotPendingApprovalError);
    });

    it('should throw NotFoundError if case does not exist', async () => {
      caseRepository.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute(validInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('execute() — AI agent failure', () => {
    it('should throw if AI agent resume fails', async () => {
      aiAgentClient.resumeAgent.mockRejectedValueOnce(new Error('Agent timeout'));
      await expect(useCase.execute(validInput)).rejects.toThrow(/timeout|unavailable/i);
    });
  });
});
