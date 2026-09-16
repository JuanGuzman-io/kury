/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { ChatOrchestratorService } from './chat-orchestrator.service';
import type { ConversationRepository } from '../ports/conversation-repository.port';
import type { LlmProvider } from '../ports/llm-provider.port';
import { OrderStatusTool } from './order-status.tool';
import { FutureActionTools } from './future-action.tools';

describe('ChatOrchestratorService', () => {
  function setup() {
    const conversations: ConversationRepository = {
      findOwned: jest.fn(),
      create: jest.fn().mockResolvedValue({
        conversationId: 'conv_1',
        userId: 'usr_1',
        orderId: 'ord_1',
        messages: [],
      }),
      appendTurn: jest.fn(),
    };
    const provider: LlmProvider = { complete: jest.fn() };
    const statusTool = { execute: jest.fn() } as unknown as OrderStatusTool;
    return {
      service: new ChatOrchestratorService(
        conversations,
        provider,
        statusTool,
        new FutureActionTools(),
      ),
      conversations,
      provider,
      statusTool,
    };
  }

  it('uses the status tool and persists a data-backed answer', async () => {
    const { service, provider, conversations, statusTool } = setup();
    (provider.complete as jest.Mock).mockResolvedValue({
      kind: 'TOOL_CALL',
      intent: 'ORDER_STATUS',
      toolCall: { name: 'get_order_status', arguments: { orderId: 'ord_1' } },
    });
    (statusTool.execute as jest.Mock).mockResolvedValue({
      ok: true,
      order: {
        order_id: 'ord_1',
        current_status: 'PICKED_UP',
        promised_at: '2026-09-16T18:00:00Z',
        delayed: false,
      },
    });

    await expect(
      service.execute({
        userId: 'usr_1',
        orderId: 'ord_1',
        message: '¿Dónde está mi pedido?',
      }),
    ).resolves.toMatchObject({
      conversation_id: 'conv_1',
      intent: 'ORDER_STATUS',
      message: expect.stringContaining('PICKED_UP'),
    });
    expect(statusTool.execute).toHaveBeenCalledWith('usr_1', 'ord_1');
    expect(conversations.appendTurn).toHaveBeenCalledWith(
      'conv_1',
      'usr_1',
      expect.any(String),
      expect.stringContaining('PICKED_UP'),
    );
  });

  it('fails closed for a provider error and does not persist a turn', async () => {
    const { service, provider, conversations } = setup();
    (provider.complete as jest.Mock).mockRejectedValue(new Error('timeout'));
    await expect(
      service.execute({ userId: 'usr_1', message: '¿Dónde está?' }),
    ).resolves.toMatchObject({
      message: expect.stringContaining('no está disponible'),
    });
    expect(conversations.appendTurn).not.toHaveBeenCalled();
  });

  it('rejects body identity that differs from trusted context', async () => {
    const { service, provider } = setup();
    await expect(
      service.execute({
        userId: 'usr_1',
        bodyUserId: 'usr_attacker',
        message: '¿Dónde está?',
      }),
    ).resolves.toMatchObject({
      message: expect.stringContaining('no coincide'),
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it('allows only one provider/tool round per message', async () => {
    const { service, provider, statusTool } = setup();
    (provider.complete as jest.Mock).mockResolvedValue({
      kind: 'TOOL_CALL',
      intent: 'ORDER_STATUS',
      toolCall: { name: 'get_order_status', arguments: { orderId: 'ord_1' } },
    });
    (statusTool.execute as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'ORDER_NOT_FOUND',
    });
    await service.execute({
      userId: 'usr_1',
      orderId: 'ord_1',
      message: 'estado',
    });
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it('fails closed for malformed provider output', async () => {
    const { service, provider, conversations } = setup();
    (provider.complete as jest.Mock).mockResolvedValue({ kind: 'TOOL_CALL' });
    await expect(
      service.execute({ userId: 'usr_1', message: 'estado' }),
    ).resolves.toMatchObject({
      message: expect.stringContaining('no válida'),
    });
    expect(conversations.appendTurn).not.toHaveBeenCalled();
  });
});
