import { OrderDomainError } from './order-domain.error';

export class OrderTransitionError extends OrderDomainError {
  constructor(
    code: 'TEMPORAL_CONFLICT' | 'TERMINAL_TRANSITION',
    message: string,
  ) {
    super(code, message, 409);
    this.name = 'OrderTransitionError';
  }
}
