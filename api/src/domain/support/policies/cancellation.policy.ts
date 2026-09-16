import type { SupportDecisionContract } from '@kuri/contracts';
import { decision } from '../value-objects/support-decision';
import type { SupportOrderContext } from '../entities/support-order-context';

export function evaluateCancellation(
  order: SupportOrderContext,
  now: Date,
): SupportDecisionContract {
  if (order.currentStatus === 'CREATED')
    return decision({
      status: 'ALLOWED',
      action: 'CANCEL_ORDER',
      reason: 'Tu pedido puede cancelarse sin costo.',
    });
  if (order.currentStatus === 'ACCEPTED') {
    const minutes = now.getTime() - order.statusOccurredAt.getTime();
    if (minutes < 5 * 60_000)
      return decision({
        status: 'ALLOWED',
        action: 'CANCEL_ORDER',
        reason:
          'Tu pedido puede cancelarse sin costo durante los primeros cinco minutos.',
      });
    return decision({
      status: 'REJECTED',
      action: 'CANCEL_ORDER',
      reason:
        'Ya pasaron cinco minutos desde que el restaurante aceptó tu pedido.',
    });
  }
  return decision({
    status: 'REJECTED',
    action: 'CANCEL_ORDER',
    reason: 'El pedido ya avanzó y no puede cancelarse en este momento.',
  });
}
