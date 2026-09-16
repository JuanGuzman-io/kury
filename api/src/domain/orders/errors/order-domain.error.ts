export type OrderErrorCode =
  | 'VALIDATION_ERROR'
  | 'EVENT_ID_CONFLICT'
  | 'TEMPORAL_CONFLICT'
  | 'TERMINAL_TRANSITION'
  | 'ORDER_NOT_FOUND';

export class OrderDomainError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    message: string,
    public readonly statusCode = 422,
  ) {
    super(message);
    this.name = 'OrderDomainError';
  }
}
