export type ToolName =
  | 'get_order_status'
  | 'request_order_cancellation'
  | 'evaluate_delay_compensation'
  | 'report_missing_items';

export const ALLOWED_TOOLS: readonly ToolName[] = [
  'get_order_status',
  'request_order_cancellation',
  'evaluate_delay_compensation',
  'report_missing_items',
];

export function isAllowedTool(name: string): name is ToolName {
  return (ALLOWED_TOOLS as readonly string[]).includes(name);
}

export function validateToolArguments(
  name: ToolName,
  args: Record<string, unknown>,
): void {
  if (typeof args.userId !== 'string' || args.userId.length === 0)
    throw new Error('INVALID_TOOL_ARGUMENTS');
  if (
    name !== 'report_missing_items' &&
    (typeof args.orderId !== 'string' || args.orderId.length === 0)
  )
    throw new Error('INVALID_TOOL_ARGUMENTS');
  if (
    name === 'report_missing_items' &&
    (typeof args.orderId !== 'string' ||
      args.orderId.length === 0 ||
      !Array.isArray(args.missingItems))
  )
    throw new Error('INVALID_TOOL_ARGUMENTS');
}
