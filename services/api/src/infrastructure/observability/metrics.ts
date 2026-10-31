import { Counter, Histogram, Registry } from 'prom-client';

/**
 * Prometheus metrics registry for the API Gateway.
 * All metrics are labelled with meaningful dimensions for alerting and dashboards.
 */
export class MetricsRegistry {
  public readonly registry: Registry;

  /** Total HTTP requests by method, route, status code */
  public readonly httpRequestsTotal: Counter;

  /** HTTP request duration histogram (seconds) */
  public readonly httpRequestDurationSeconds: Histogram;

  /** Total support cases created */
  public readonly casesCreatedTotal: Counter;

  /** Total support cases resolved */
  public readonly casesResolvedTotal: Counter;

  /** Total refund requests by outcome */
  public readonly refundRequestsTotal: Counter;

  /** AI service call duration */
  public readonly aiServiceCallDurationSeconds: Histogram;

  /** AI service circuit breaker state changes */
  public readonly circuitBreakerStateChanges: Counter;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ service: 'api-gateway' });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.casesCreatedTotal = new Counter({
      name: 'cases_created_total',
      help: 'Total number of support cases created',
      labelNames: ['intent'],
      registers: [this.registry],
    });

    this.casesResolvedTotal = new Counter({
      name: 'cases_resolved_total',
      help: 'Total number of support cases resolved',
      labelNames: ['resolution_type'],
      registers: [this.registry],
    });

    this.refundRequestsTotal = new Counter({
      name: 'refund_requests_total',
      help: 'Total number of refund requests',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.aiServiceCallDurationSeconds = new Histogram({
      name: 'ai_service_call_duration_seconds',
      help: 'Duration of calls to the AI microservice',
      labelNames: ['endpoint', 'status'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.circuitBreakerStateChanges = new Counter({
      name: 'circuit_breaker_state_changes_total',
      help: 'Total circuit breaker state changes',
      labelNames: ['service', 'state'],
      registers: [this.registry],
    });
  }
}

/** Singleton metrics registry */
export const metricsRegistry = new MetricsRegistry();
