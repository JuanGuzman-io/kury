import type { CityCode, OrderStatus, Weather } from '@kuri/contracts';

export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'CREATED',
  'ACCEPTED',
  'COURIER_ASSIGNED',
  'PICKED_UP',
];

export const CITY_TIME_ZONES: Record<CityCode, string> = {
  BOG: 'America/Bogota',
  MEX: 'America/Mexico_City',
  LIM: 'America/Lima',
};

export interface RiskOrderContext {
  orderId: string;
  city: CityCode;
  currentStatus: OrderStatus;
  statusOccurredAt: Date;
  acceptedAt: Date | null;
  promisedAt: Date;
  weather: Weather;
  averagePreparationMinutes: number | null;
}

export interface RiskRuleConfig {
  weather: Record<Weather, number>;
  peakHour: number;
  prepOverAverage: number;
  prepOverOneAndHalfAverage: number;
  statusDuration: Partial<
    Record<OrderStatus, { minutes: number; points: number }>
  >;
  remainingUnderTen: number;
  remainingUnderFive: number;
  delayed: number;
  thresholds: { medium: number; high: number };
}

export const DEFAULT_RISK_RULE_CONFIG: RiskRuleConfig = {
  weather: { CLEAR: 0, RAIN: 10, STORM: 20 },
  peakHour: 10,
  prepOverAverage: 20,
  prepOverOneAndHalfAverage: 15,
  statusDuration: {
    CREATED: { minutes: 5, points: 5 },
    COURIER_ASSIGNED: { minutes: 10, points: 10 },
    PICKED_UP: { minutes: 20, points: 10 },
  },
  remainingUnderTen: 20,
  remainingUnderFive: 20,
  delayed: 40,
  thresholds: { medium: 30, high: 60 },
};
