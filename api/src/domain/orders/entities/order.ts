import type { CityCode, OrderStatus, Weather } from '@kuri/contracts';
import type { OrderItem } from './order-item';

export interface OrderProjection {
  orderId: string;
  userId: string;
  city: CityCode;
  restaurantId: string;
  courierId: string | null;
  currentStatus: OrderStatus;
  currentEventId: string;
  statusOccurredAt: Date;
  promisedAt: Date;
  weather: Weather;
  totalAmountCents: number;
  items: OrderItem[];
}
