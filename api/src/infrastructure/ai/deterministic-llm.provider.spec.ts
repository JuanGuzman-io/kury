/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { DeterministicLlmProvider } from './deterministic-llm.provider';

describe('DeterministicLlmProvider', () => {
  const provider = new DeterministicLlmProvider();

  it('selects order status for a Spanish status question', async () => {
    await expect(
      provider.complete(
        [{ role: 'USER', content: '¿Dónde está ord_000123?' }],
        ['get_order_status'],
      ),
    ).resolves.toEqual({
      kind: 'TOOL_CALL',
      intent: 'ORDER_STATUS',
      toolCall: {
        name: 'get_order_status',
        arguments: { orderId: 'ord_000123' },
      },
    });
  });

  it('does not execute or invent answers for out-of-scope requests', async () => {
    await expect(
      provider.complete(
        [{ role: 'USER', content: '¿Cuál es la capital de Perú?' }],
        ['get_order_status'],
      ),
    ).resolves.toMatchObject({
      kind: 'FINAL',
      intent: 'OUT_OF_SCOPE',
      text: expect.stringContaining('soporte'),
    });
  });
});
