import CircuitBreakerLib from 'opossum';
import { fetch } from 'undici';
import { config } from '../../config.js';
import { logger } from '../observability/logger.js';
import { metricsRegistry } from '../observability/metrics.js';

/** Request payload to start a new agent run */
export interface RunAgentRequest {
  thread_id: string;
  customer_id: string;
  message: string;
  context?: Record<string, unknown>;
}

/** Request payload to resume a paused graph */
export interface ResumeAgentRequest {
  thread_id: string;
  approved: boolean;
  approver_id: string;
  notes?: string;
}

/** Response from the AI agent service */
export interface AgentResponse {
  thread_id: string;
  status: 'completed' | 'pending_approval' | 'error';
  response?: string;
  pending_action?: {
    type: string;
    amount?: number;
    description: string;
  };
  error?: string;
}

/** Agent graph state snapshot */
export interface AgentStateSnapshot {
  thread_id: string;
  current_node: string;
  intent?: string;
  approval_status?: string;
  messages: Array<{ role: string; content: string }>;
}

/**
 * IAIAgentClient defines the contract for communicating with the Python AI service.
 * Follows Dependency Inversion — callers depend on this interface, not the concrete class.
 */
export interface IAIAgentClient {
  runAgent(req: RunAgentRequest): Promise<AgentResponse>;
  resumeAgent(req: ResumeAgentRequest): Promise<AgentResponse>;
  getAgentState(threadId: string): Promise<AgentStateSnapshot>;
}

/**
 * HTTP client for the Python AI microservice.
 * Wraps all calls in an opossum circuit breaker to prevent cascade failures.
 *
 * Pattern: Adapter + Circuit Breaker
 */
export class AIAgentClient implements IAIAgentClient {
  private readonly baseUrl: string;
  private readonly internalToken: string;
  private readonly circuitBreaker: CircuitBreakerLib<[string, unknown], unknown>;

  constructor(baseUrl: string, internalToken: string) {
    this.baseUrl = baseUrl;
    this.internalToken = internalToken;

    // Circuit breaker: opens after 50% failure rate over 10 requests
    // Waits 30s before attempting half-open
    this.circuitBreaker = new CircuitBreakerLib(this.makeRequest.bind(this), {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeout: 65_000,  // 65s — LLM calls can be slow
      resetTimeout: 30_000,
    });

    this.circuitBreaker.on('open', () => {
      logger.warn('AI service circuit breaker OPEN — failing fast');
      metricsRegistry.circuitBreakerStateChanges.inc({ service: 'ai-agent', state: 'open' });
    });
    this.circuitBreaker.on('halfOpen', () => {
      logger.info('AI service circuit breaker HALF-OPEN — testing');
      metricsRegistry.circuitBreakerStateChanges.inc({ service: 'ai-agent', state: 'half-open' });
    });
    this.circuitBreaker.on('close', () => {
      logger.info('AI service circuit breaker CLOSED — back to normal');
      metricsRegistry.circuitBreakerStateChanges.inc({ service: 'ai-agent', state: 'closed' });
    });
  }

  private async makeRequest<T>(path: string, body: unknown): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': this.internalToken,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(65_000),
    });

    const duration = (Date.now() - startTime) / 1000;
    const status = response.ok ? 'success' : 'error';
    metricsRegistry.aiServiceCallDurationSeconds.observe(
      { endpoint: path, status },
      duration
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ path, status: response.status, body: errorText }, 'AI service returned error');
      throw new Error(`AI service error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async runAgent(req: RunAgentRequest): Promise<AgentResponse> {
    return this.circuitBreaker.fire('/run', req) as Promise<AgentResponse>;
  }

  async resumeAgent(req: ResumeAgentRequest): Promise<AgentResponse> {
    return this.circuitBreaker.fire('/resume', req) as Promise<AgentResponse>;
  }

  async getAgentState(threadId: string): Promise<AgentStateSnapshot> {
    const response = await fetch(`${this.baseUrl}/state/${threadId}`, {
      headers: { 'X-Internal-Token': this.internalToken },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Failed to get agent state: ${response.status}`);
    return response.json() as Promise<AgentStateSnapshot>;
  }
}
