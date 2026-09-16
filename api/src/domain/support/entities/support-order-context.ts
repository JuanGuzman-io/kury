export interface SupportLineItem {
  lineNumber: number;
  unitPriceCents: number;
  quantity: number;
}
export interface SupportOrderContext {
  orderId: string;
  userId: string;
  currentStatus: string;
  statusOccurredAt: Date;
  city?: 'BOG' | 'MEX' | 'LIM';
  restaurantId?: string;
  weather?: 'CLEAR' | 'RAIN' | 'STORM';
  promisedAt: Date;
  totalAmountCents: number;
  items: readonly SupportLineItem[];
}
