import type { SupportDecisionContract } from '@kuri/contracts';
import { cappedCents, USD_CENTS } from '../value-objects/money';
import { decision } from '../value-objects/support-decision';
import type { SupportOrderContext } from '../entities/support-order-context';

export function evaluateMissingItems(
  order: SupportOrderContext,
  requestedLines: readonly number[],
): SupportDecisionContract {
  const unique = [...new Set(requestedLines)];
  const valid = unique.filter(
    (line) =>
      Number.isInteger(line) &&
      order.items.some((item) => item.lineNumber === line),
  );
  if (valid.length === 0)
    return decision({
      status: 'REJECTED',
      action: 'REFUND',
      reason: 'No encontré ítems válidos para procesar el reclamo.',
    });
  const raw = valid.reduce((sum, line) => {
    const item = order.items.find(
      (candidate) => candidate.lineNumber === line,
    )!;
    return sum + item.unitPriceCents * item.quantity;
  }, 0);
  const amount = cappedCents(raw, Math.floor(order.totalAmountCents / 2));
  if (amount > USD_CENTS.eightDollars)
    return decision({
      status: 'REQUIRES_APPROVAL',
      action: 'REFUND',
      amountCents: amount,
      reason: 'El reembolso supera USD 8 y requiere aprobación humana.',
    });
  return decision({
    status: 'ALLOWED',
    action: 'REFUND',
    amountCents: amount,
    reason: 'El reembolso corresponde al valor de los ítems faltantes.',
  });
}
