export type AssistantIntent =
  | 'ORDER_STATUS'
  | 'CANCEL_ORDER'
  | 'LATE_ORDER_COMPLAINT'
  | 'MISSING_ITEMS'
  | 'OUT_OF_SCOPE';
import type { ToolName } from '../../../domain/conversations/services/tool-catalog';
export type { ToolName } from '../../../domain/conversations/services/tool-catalog';

export interface LlmMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}
export interface LlmToolCall {
  name: string;
  arguments: Record<string, unknown>;
}
export type LlmResult =
  | { kind: 'FINAL'; text: string; intent: AssistantIntent }
  | { kind: 'TOOL_CALL'; intent: AssistantIntent; toolCall: LlmToolCall };
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
export interface LlmProvider {
  complete(
    messages: LlmMessage[],
    tools: readonly ToolName[],
  ): Promise<LlmResult>;
}
