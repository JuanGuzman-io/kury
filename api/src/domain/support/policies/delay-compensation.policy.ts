import type { SupportDecisionContract } from '@kuri/contracts';
import {
  cappedCents,
  percentageCents,
  USD_CENTS,
} from '../value-objects/money';
import { decision } from '../value-objects/support-decision';
import type { SupportOrderContext } from '../entities/support-order-context';

export function evaluateDelayCompensation(
  order: SupportOrderContext,
  now: Date,
  alternative?: 'FULL_REFUND' | 'WAIT_WITH_30_PERCENT_COUPON',
): SupportDecisionContract {
  const delay = now.getTime() - order.promisedAt.getTime();
  if (delay <= 20 * 60_000)
    return decision({
      status: 'REJECTED',
      action: 'ISSUE_COUPON',
      reason:
        'Tu pedido todavía no supera el umbral de compensación por retraso.',
    });
  if (delay <= 45 * 60_000)
    return couponDecision(order.totalAmountCents, 15, USD_CENTS.fiveDollars);
  const coupon = cappedCents(
    percentageCents(order.totalAmountCents, 30),
    USD_CENTS.tenDollars,
  );
  const alternatives = [
    {
      action: 'REFUND' as const,
      alternative: 'FULL_REFUND' as const,
      amountCents: order.totalAmountCents,
    },
    {
      action: 'ISSUE_COUPON' as const,
      alternative: 'WAIT_WITH_30_PERCENT_COUPON' as const,
      amountCents: coupon,
    },
  ];
  if (!alternative)
    return decision({
      status: 'NEEDS_CHOICE',
      action: 'REFUND',
      reason:
        'Puedes elegir entre un reembolso total o un cupón del 30%. Selecciona una opción para continuar.',
      alternatives,
    });
  const selected = alternatives.find(
    (item) => item.alternative === alternative,
  )!;
  return selected.amountCents > USD_CENTS.eightDollars
    ? decision({
        status: 'REQUIRES_APPROVAL',
        action: selected.action,
        amountCents: selected.amountCents,
        reason: 'Esta compensación supera USD 8 y requiere aprobación humana.',
      })
    : decision({
        status: 'ALLOWED',
        action: selected.action,
        amountCents: selected.amountCents,
        reason: 'La compensación fue aprobada por la política de retraso.',
      });
}
function couponDecision(
  total: number,
  percentage: number,
  cap: number,
): SupportDecisionContract {
  const amount = cappedCents(percentageCents(total, percentage), cap);
  return amount > USD_CENTS.eightDollars
    ? decision({
        status: 'REQUIRES_APPROVAL',
        action: 'ISSUE_COUPON',
        amountCents: amount,
        reason: 'Esta compensación supera USD 8 y requiere aprobación humana.',
      })
    : decision({
        status: 'ALLOWED',
        action: 'ISSUE_COUPON',
        amountCents: amount,
        reason: 'Tu retraso habilita un cupón del 15%.',
      });
}
