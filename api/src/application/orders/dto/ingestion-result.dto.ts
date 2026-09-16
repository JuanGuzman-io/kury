import type { IngestionOutcome, OrderStatus } from '@kuri/contracts';

export interface IngestionResult {
  outcome: IngestionOutcome;
  eventId: string;
  orderId: string;
  currentStatus: OrderStatus | null;
  reasonCode: string | null;
}
