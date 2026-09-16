import type { CityCode, OrderStatus, Weather } from './order-events';

export interface RestaurantOperationalView {
  restaurant_id: string;
  name: string;
}

export interface OrderListItem {
  order_id: string;
  city: CityCode;
  restaurant: RestaurantOperationalView;
  courier_id: string | null;
  current_status: OrderStatus;
  delayed: boolean;
  promised_at: string;
  total_amount_cents: number;
  updated_at: string;
}

export interface OrderListResponse {
  data: OrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderDetailResponse extends OrderListItem {
  user_id: string;
  current_event_id: string;
  status_occurred_at: string;
  weather: Weather;
  created_at: string;
  items: Array<{
    line_number: number;
    sku: string;
    name: string;
    quantity: number;
    unit_price_cents: number;
  }>;
  timeline: Array<{
    event_id: string;
    type: string;
    status: OrderStatus | null;
    actor: string;
    occurred_at: string;
    received_at: string;
    courier_id: string | null;
    processing_outcome: string;
    rejection_code: string | null;
  }>;
}

export interface OrderListQuery {
  city?: CityCode;
  status?: OrderStatus;
  delayed?: boolean;
  page: number;
  limit: number;
}
