import { Inject, Injectable } from '@nestjs/common';
import type { ToolName } from '../../../domain/conversations/services/tool-catalog';
import type { SupportActionResult } from '@kuri/contracts';
import {
  SUPPORT_ACTION_ORCHESTRATOR,
  type SupportActionOrchestratorService,
} from '../../support/services/support-action-orchestrator.service';

export interface FutureActionResult {
  ok: false;
  code: 'NOT_IMPLEMENTED_US5';
  prepared: boolean;
  tool: ToolName;
}

@Injectable()
export class FutureActionTools {
  constructor(
    @Inject(SUPPORT_ACTION_ORCHESTRATOR)
    private readonly supportActions?: SupportActionOrchestratorService,
  ) {}

  async execute(
    tool: ToolName,
    userId?: string,
    orderId?: string,
    alternative?: 'FULL_REFUND' | 'WAIT_WITH_30_PERCENT_COUPON',
    missingItemLines?: number[],
  ): Promise<FutureActionResult | SupportActionResult> {
    if (!this.supportActions || !userId || !orderId)
      return { ok: false, code: 'NOT_IMPLEMENTED_US5', prepared: true, tool };
    const action =
      tool === 'request_order_cancellation'
        ? 'CANCEL_ORDER'
        : tool === 'evaluate_delay_compensation'
          ? 'ISSUE_COUPON'
          : 'REFUND';
    return this.supportActions.execute(userId, {
      order_id: orderId,
      action,
      alternative,
      missing_item_lines: missingItemLines,
    });
  }
}
