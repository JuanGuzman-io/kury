import { Inject, Injectable } from '@nestjs/common';
import {
  isAllowedTool,
  validateToolArguments,
} from '../../../domain/conversations/services/tool-catalog';
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
  type ConversationRecord,
} from '../ports/conversation-repository.port';
import {
  LLM_PROVIDER,
  type LlmProvider,
  type LlmResult,
} from '../ports/llm-provider.port';
import { OrderStatusTool } from './order-status.tool';
import { FutureActionTools } from './future-action.tools';
import { AuditTraceService } from '../../audit/services/audit-trace.service';

export interface ChatCommand {
  conversationId?: string;
  userId: string;
  bodyUserId?: string;
  orderId?: string;
  message: string;
}
export interface ChatResult {
  conversation_id: string;
  message: string;
  intent?: string;
}

@Injectable()
export class ChatOrchestratorService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LLM_PROVIDER) private readonly provider: LlmProvider,
    private readonly statusTool: OrderStatusTool,
    private readonly futureActions: FutureActionTools,
    private readonly audit?: AuditTraceService,
  ) {}

  async execute(command: ChatCommand): Promise<ChatResult> {
    if (!command.userId)
      return {
        conversation_id: '',
        message: 'No pude validar tu identidad para consultar el pedido.',
      };
    if (command.bodyUserId && command.bodyUserId !== command.userId) {
      return {
        conversation_id: '',
        message:
          'El usuario indicado no coincide con el contexto de la sesión.',
      };
    }
    const conversation: ConversationRecord | null = command.conversationId
      ? await this.conversations.findOwned(
          command.conversationId,
          command.userId,
        )
      : await this.conversations.create(
          command.userId,
          command.orderId ?? null,
        );
    if (!conversation)
      return {
        conversation_id: command.conversationId ?? '',
        message: 'No encontré una conversación válida para tu usuario.',
      };
    const userMessage =
      command.orderId && !command.message.includes(command.orderId)
        ? `${command.message} (${command.orderId})`
        : command.message;
    await this.audit?.record({
      type: 'MESSAGE',
      conversationId: conversation.conversationId,
      orderId: command.orderId,
      payload: { role: 'USER', content: userMessage },
    });
    if (
      conversation.orderId &&
      command.orderId &&
      conversation.orderId !== command.orderId
    ) {
      return {
        conversation_id: conversation.conversationId,
        message: 'Esta conversación está vinculada a otro pedido.',
      };
    }
    let result: LlmResult;
    const llmStarted = performance.now();
    try {
      const providerResult: unknown = await this.provider.complete(
        [...conversation.messages, { role: 'USER', content: userMessage }],
        [
          'get_order_status',
          'request_order_cancellation',
          'evaluate_delay_compensation',
          'report_missing_items',
        ],
      );
      if (!isValidLlmResult(providerResult)) {
        await this.audit?.record({
          type: 'LLM_CALL',
          conversationId: conversation.conversationId,
          orderId: command.orderId,
          payload: {
            status: 'INVALID_RESPONSE',
            provider: 'deterministic',
            model: 'in-memory',
            prompt_tokens: null,
            completion_tokens: null,
            total_tokens: null,
            estimated_cost: null,
            duration_ms: performance.now() - llmStarted,
          },
        });
        return {
          conversation_id: conversation.conversationId,
          message:
            'El asistente devolvió una respuesta no válida. Inténtalo de nuevo.',
        };
      }
      result = providerResult;
    } catch {
      await this.audit?.record({
        type: 'LLM_CALL',
        conversationId: conversation.conversationId,
        orderId: command.orderId,
        payload: {
          status: 'ERROR',
          provider: 'deterministic',
          model: 'in-memory',
          prompt_tokens: null,
          completion_tokens: null,
          total_tokens: null,
          estimated_cost: null,
          duration_ms: performance.now() - llmStarted,
        },
      });
      return {
        conversation_id: conversation.conversationId,
        message:
          'El asistente no está disponible en este momento. Inténtalo de nuevo.',
      };
    }
    await this.audit?.record({
      type: 'LLM_CALL',
      conversationId: conversation.conversationId,
      orderId: command.orderId,
      payload: {
        status: 'SUCCESS',
        provider: 'deterministic',
        model: 'in-memory',
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        estimated_cost: null,
        duration_ms: performance.now() - llmStarted,
        intent: result.intent,
      },
    });
    let response: string;
    let decisionStatus = 'FINAL_RESPONSE';
    if (result.kind === 'FINAL') response = result.text;
    else {
      if (!isAllowedTool(result.toolCall.name))
        return {
          conversation_id: conversation.conversationId,
          message: 'No puedo ejecutar esa solicitud.',
        };
      const argumentOrderId = result.toolCall.arguments.orderId;
      const orderId =
        command.orderId ??
        (typeof argumentOrderId === 'string' ? argumentOrderId : '');
      const args = {
        ...result.toolCall.arguments,
        userId: command.userId,
        orderId,
      };
      try {
        validateToolArguments(result.toolCall.name, args);
      } catch {
        return {
          conversation_id: conversation.conversationId,
          message: 'No pude validar los datos necesarios para esa solicitud.',
        };
      }
      const toolStarted = performance.now();
      if (result.toolCall.name === 'get_order_status') {
        const tool = await this.statusTool.execute(command.userId, orderId);
        decisionStatus = tool.ok ? 'ALLOWED' : tool.code;
        await this.audit?.record({
          type: 'TOOL_EXECUTION',
          conversationId: conversation.conversationId,
          orderId,
          payload: {
            tool_name: result.toolCall.name,
            arguments: args,
            result: tool,
            status: tool.ok ? 'SUCCESS' : 'ERROR',
            duration_ms: performance.now() - toolStarted,
          },
        });
        response = tool.ok
          ? `Tu pedido está en estado ${tool.order.current_status}. La hora prometida es ${tool.order.promised_at}.`
          : tool.code === 'ORDER_NOT_OWNED_BY_USER'
            ? 'No puedo compartir información de ese pedido.'
            : 'No encontré ese pedido.';
      } else {
        const futureAction = await this.futureActions.execute(
          result.toolCall.name,
          command.userId,
          orderId,
        );
        decisionStatus =
          'status' in futureAction ? futureAction.status : 'PREPARED';
        await this.audit?.record({
          type: 'TOOL_EXECUTION',
          conversationId: conversation.conversationId,
          orderId,
          payload: {
            tool_name: result.toolCall.name,
            arguments: args,
            result: futureAction,
            status: 'SUCCESS',
            duration_ms: performance.now() - toolStarted,
          },
        });
        response =
          'prepared' in futureAction && futureAction.prepared
            ? 'Recibí tu solicitud. Todavía no está habilitada para ejecución; no se realizó ningún cambio en tu pedido.'
            : 'status' in futureAction &&
                futureAction.status === 'REQUIRES_APPROVAL'
              ? 'Tu solicitud requiere aprobación humana antes de ejecutar la compensación.'
              : 'status' in futureAction && futureAction.status === 'ALLOWED'
                ? 'La solicitud fue procesada según las reglas de soporte.'
                : 'No pude procesar esa solicitud.';
      }
      await this.audit?.record({
        type: 'DECISION',
        conversationId: conversation.conversationId,
        orderId,
        payload: {
          action: result.toolCall.name,
          status: decisionStatus,
          intent: result.intent,
        },
      });
    }
    await this.conversations.appendTurn(
      conversation.conversationId,
      command.userId,
      userMessage,
      response,
    );
    await this.audit?.record({
      type: 'MESSAGE',
      conversationId: conversation.conversationId,
      orderId: command.orderId,
      payload: { role: 'ASSISTANT', content: response },
    });
    return {
      conversation_id: conversation.conversationId,
      message: response,
      intent: result.intent,
    };
  }
}

function isValidLlmResult(value: unknown): value is LlmResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as {
    kind?: unknown;
    text?: unknown;
    intent?: unknown;
    toolCall?: unknown;
  };
  if (typeof result.intent !== 'string') return false;
  if (result.kind === 'FINAL') return typeof result.text === 'string';
  if (
    result.kind !== 'TOOL_CALL' ||
    !result.toolCall ||
    typeof result.toolCall !== 'object'
  )
    return false;
  const toolCall = result.toolCall as { name?: unknown; arguments?: unknown };
  return (
    typeof toolCall.name === 'string' &&
    !!toolCall.arguments &&
    typeof toolCall.arguments === 'object'
  );
}
