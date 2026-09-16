import type {
  CityCode,
  EventActor,
  EventProcessingOutcome,
  OrderEventType,
  OrderStatus,
  Weather,
} from '@kuri/contracts';
import type { OrderItem } from './order-item';

export interface CreatedOrderData {
  userId: string;
  city: CityCode;
  restaurantId: string;
  items: OrderItem[];
  totalAmountCents: number;
  promisedAt: Date;
  weather: Weather;
}

export interface OrderEvent {
  eventId: string;
  orderId: string;
  type: OrderEventType;
  status: OrderStatus | null;
  actor: EventActor;
  courierId: string | null;
  cancelReason: string | null;
  occurredAt: Date;
  receivedAt: Date;
  payload: Record<string, unknown>;
  contentHash: string;
  ingestionSequence: number;
  processingOutcome: EventProcessingOutcome;
  rejectionCode: string | null;
  createdOrder: CreatedOrderData | null;
}
