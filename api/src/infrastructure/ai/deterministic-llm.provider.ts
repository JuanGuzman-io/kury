import { Injectable } from '@nestjs/common';
import type {
  LlmMessage,
  LlmProvider,
  LlmResult,
  ToolName,
} from '../../application/chat/ports/llm-provider.port';

@Injectable()
export class DeterministicLlmProvider implements LlmProvider {
  async complete(
    messages: LlmMessage[],
    tools: readonly ToolName[],
  ): Promise<LlmResult> {
    void tools;
    await Promise.resolve();
    const text = messages.at(-1)?.content.toLowerCase() ?? '';
    if (
      text.includes('dónde') ||
      text.includes('donde') ||
      text.includes('estado') ||
      text.includes('falta')
    ) {
      const orderId = extractOrderId(messages) ?? '';
      return {
        kind: 'TOOL_CALL',
        intent: 'ORDER_STATUS',
        toolCall: { name: 'get_order_status', arguments: { orderId } },
      };
    }
    if (text.includes('cancel'))
      return stub('CANCEL_ORDER', 'request_order_cancellation', messages);
    if (text.includes('incompleto') || text.includes('faltan'))
      return stub('MISSING_ITEMS', 'report_missing_items', messages);
    if (text.includes('retras') || text.includes('tarde'))
      return stub(
        'LATE_ORDER_COMPLAINT',
        'evaluate_delay_compensation',
        messages,
      );
    return {
      kind: 'FINAL',
      intent: 'OUT_OF_SCOPE',
      text: 'Puedo ayudarte con el estado de tu pedido y solicitudes de soporte relacionadas.',
    };
  }
}

function extractOrderId(messages: LlmMessage[]): string | undefined {
  return messages
    .map((message) => message.content.match(/ord_[A-Za-z0-9_-]+/)?.[0])
    .find(Boolean);
}
function stub(
  intent: 'CANCEL_ORDER' | 'LATE_ORDER_COMPLAINT' | 'MISSING_ITEMS',
  name: ToolName,
  messages: LlmMessage[],
): LlmResult {
  return {
    kind: 'TOOL_CALL',
    intent,
    toolCall: {
      name,
      arguments: {
        userId: '',
        orderId: extractOrderId(messages) ?? '',
        ...(name === 'report_missing_items' ? { missingItems: [] } : {}),
      },
    },
  };
}
