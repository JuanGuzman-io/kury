export const orderEventTypes = ['ORDER_CREATED', 'ORDER_STATUS_CHANGED'] as const;
export type OrderEventType = (typeof orderEventTypes)[number];

export const orderStatuses = [
  'CREATED',
  'ACCEPTED',
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const eventActors = ['USER', 'RESTAURANT', 'COURIER', 'SYSTEM', 'OPS'] as const;
export type EventActor = (typeof eventActors)[number];

export const cityCodes = ['BOG', 'MEX', 'LIM'] as const;
export type CityCode = (typeof cityCodes)[number];

export const weatherCodes = ['CLEAR', 'RAIN', 'STORM'] as const;
export type Weather = (typeof weatherCodes)[number];

export const eventProcessingOutcomes = [
  'APPLIED',
  'HISTORICAL',
  'PENDING_SEQUENCE',
  'REJECTED_CONFLICT',
] as const;
export type EventProcessingOutcome = (typeof eventProcessingOutcomes)[number];

export const ingestionOutcomes = [
  'APPLIED',
  'HISTORICAL',
  'PENDING',
  'DUPLICATE',
  'REJECTED_VALIDATION',
  'REJECTED_CONFLICT',
] as const;
export type IngestionOutcome = (typeof ingestionOutcomes)[number];

export interface OrderItemInput {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number | string;
}

export interface OrderCreatedPayload {
  user_id: string;
  city: CityCode;
  restaurant_id: string;
  actor: EventActor;
  items: OrderItemInput[];
  total_amount: number | string;
  promised_at: string;
  weather: Weather;
  dropoff?: { lat: number; lng: number };
}

export interface OrderStatusChangedPayload {
  status: Exclude<OrderStatus, 'CREATED'>;
  actor: EventActor;
  courier_id?: string;
  cancel_reason?: string;
}

export interface OrderCreatedEventInput {
  event_id: string;
  order_id: string;
  type: 'ORDER_CREATED';
  occurred_at: string;
  received_at: string;
  payload: OrderCreatedPayload;
}

export interface OrderStatusChangedEventInput {
  event_id: string;
  order_id: string;
  type: 'ORDER_STATUS_CHANGED';
  occurred_at: string;
  received_at: string;
  payload: OrderStatusChangedPayload;
}

export type OrderEventInput = OrderCreatedEventInput | OrderStatusChangedEventInput;

export interface IngestionResponse {
  outcome: Exclude<IngestionOutcome, 'REJECTED_VALIDATION' | 'REJECTED_CONFLICT'>;
  event_id: string;
  order_id: string;
  current_status: OrderStatus | null;
  reason_code: string | null;
}
