import { Injectable } from '@nestjs/common';
import type { ToolName } from '../../../domain/conversations/services/tool-catalog';

export interface FutureActionResult {
  ok: false;
  code: 'NOT_IMPLEMENTED_US5';
  prepared: boolean;
  tool: ToolName;
}

@Injectable()
export class FutureActionTools {
  execute(tool: ToolName): FutureActionResult {
    return { ok: false, code: 'NOT_IMPLEMENTED_US5', prepared: true, tool };
  }
}
