/**
 * Base Domain Event interface.
 * Implements Observer / Event Emitter pattern for decoupling side-effects.
 */
export interface IDomainEvent {
  readonly eventName: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}

export abstract class BaseDomainEvent implements IDomainEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly payload: Record<string, unknown> = {}
  ) {
    this.occurredAt = new Date();
  }
}
