/**
 * Domain error base class.
 *
 * All business-rule violations extend this class.
 * The global error handler maps these to HTTP 422 Unprocessable Entity.
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 422) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Thrown when a requested resource is not found */
export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id '${id}' not found`, 404);
  }
}

/** Thrown when JWT is missing, expired, or invalid */
export class AuthenticationError extends DomainError {
  constructor(message = 'Authentication required') {
    super('UNAUTHENTICATED', message, 401);
  }
}

/** Thrown when authenticated user lacks permission */
export class AuthorizationError extends DomainError {
  constructor(action: string) {
    super('UNAUTHORIZED', `You do not have permission to ${action}`, 403);
  }
}

/** Thrown when a refund is requested but not eligible */
export class RefundIneligibleError extends DomainError {
  constructor(reason: string) {
    super('REFUND_INELIGIBLE', `Refund not eligible: ${reason}`);
  }
}

/** Thrown when a case cannot be approved (wrong state) */
export class CaseNotPendingApprovalError extends DomainError {
  constructor(caseId: string) {
    super('CASE_NOT_PENDING', `Case '${caseId}' is not pending approval`);
  }
}

/** Thrown when the AI microservice is unavailable */
export class AIServiceUnavailableError extends DomainError {
  constructor(details?: string) {
    super(
      'AI_SERVICE_UNAVAILABLE',
      `AI service is currently unavailable${details ? `: ${details}` : ''}`,
      503
    );
  }
}

/** Thrown when request validation fails */
export class ValidationError extends DomainError {
  public readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super('VALIDATION_ERROR', 'Request validation failed', 400);
    this.fields = fields;
  }
}

/** Thrown when rate limit is exceeded */
export class RateLimitError extends DomainError {
  constructor(retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', `Rate limit exceeded. Retry after ${retryAfter}s`, 429);
  }
}
