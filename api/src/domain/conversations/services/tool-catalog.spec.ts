import { isAllowedTool, validateToolArguments } from './tool-catalog';

describe('tool catalog', () => {
  it('rejects tools outside the allow-list', () => {
    expect(isAllowedTool('execute_sql')).toBe(false);
  });

  it('requires trusted identity and a non-empty order id', () => {
    expect(() =>
      validateToolArguments('get_order_status', {
        userId: 'usr_1',
        orderId: '',
      }),
    ).toThrow('INVALID_TOOL_ARGUMENTS');
    expect(() =>
      validateToolArguments('get_order_status', {
        userId: 'usr_1',
        orderId: 'ord_1',
      }),
    ).not.toThrow();
  });
});
