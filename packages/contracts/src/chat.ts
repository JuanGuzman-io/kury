export type AssistantIntent =
  | 'ORDER_STATUS'
  | 'CANCEL_ORDER'
  | 'LATE_ORDER_COMPLAINT'
  | 'MISSING_ITEMS'
  | 'OUT_OF_SCOPE';

export interface ChatRequest {
  conversation_id?: string;
  user_id?: string;
  order_id?: string;
  message: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  intent?: AssistantIntent;
}
