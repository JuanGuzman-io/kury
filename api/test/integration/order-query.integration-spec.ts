import { DataSource } from 'typeorm';
import { createTestApp } from '../support/test-app';
import { insertOrderFixture } from '../support/order-query-fixtures';
import { ListOrdersUseCase } from '../../src/application/orders/use-cases/list-orders.use-case';

describe('order query integration', () => {
  let dataSource: DataSource;
  let listOrders: ListOrdersUseCase;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const testApp = await createTestApp();
    dataSource = testApp.dataSource;
    listOrders = testApp.app.get(ListOrdersUseCase);
    close = () => testApp.app.close();
    await insertOrderFixture(dataSource, `integration_${Date.now()}`, {
      city: 'MEX',
      status: 'PICKED_UP',
      promisedAt: new Date('2020-01-01T00:00:00Z'),
    });
    await insertOrderFixture(
      dataSource,
      `integration_delivered_${Date.now()}`,
      {
        city: 'MEX',
        status: 'DELIVERED',
        promisedAt: new Date('2020-01-01T00:00:00Z'),
      },
    );
  });

  afterAll(async () => close());

  it('applies city, status and delayed filters together without mutation', async () => {
    const before = await dataSource.query<{ projection_version: number }[]>(
      "SELECT projection_version FROM orders WHERE city = 'MEX' ORDER BY order_id",
    );
    const result = await listOrders.execute(
      { city: 'MEX', status: 'PICKED_UP', delayed: true, page: 1, limit: 20 },
      new Date('2026-09-15T13:00:00Z'),
    );

    expect(result.data.length).toBeGreaterThan(0);
    expect(
      result.data.every(
        (item) =>
          item.city === 'MEX' &&
          item.current_status === 'PICKED_UP' &&
          item.delayed,
      ),
    ).toBe(true);
    expect(result.data[0]).not.toHaveProperty('timeline');
    const after = await dataSource.query<{ projection_version: number }[]>(
      "SELECT projection_version FROM orders WHERE city = 'MEX' ORDER BY order_id",
    );
    expect(after).toEqual(before);
  });

  it('supports delayed=false and exact-time boundaries', async () => {
    const result = await listOrders.execute(
      { delayed: false, page: 1, limit: 100 },
      new Date('2020-01-01T00:00:00Z'),
    );
    expect(result.data.every((item) => !item.delayed)).toBe(true);
  });
});
