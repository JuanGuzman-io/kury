import type { OrderDetailResponse, OrderListItem, OrderListQuery } from './order-queries';

export const riskLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskLevel = (typeof riskLevels)[number];

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export interface RiskOrderListItem extends OrderListItem {
  risk: RiskAssessment;
}

export interface RiskOrderDetail extends OrderDetailResponse {
  risk: RiskAssessment;
}

export interface AtRiskOrderQuery extends OrderListQuery {}

export interface AtRiskOrderResponse {
  data: RiskOrderListItem[];
  pagination: OrderListResponsePagination;
}

export interface OrderListResponsePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
