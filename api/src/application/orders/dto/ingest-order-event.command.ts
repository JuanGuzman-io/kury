import type { OrderEventInput } from '@kuri/contracts';
import type { OrderEvent } from '../../../domain/orders/entities/order-event';

export interface IngestOrderEventCommand {
  input: OrderEventInput;
  event: OrderEvent;
}
