import { DataSource } from 'typeorm';
import { createTestApp } from '../support/test-app';
import { ListOrdersUseCase } from '../../src/application/orders/use-cases/list-orders.use-case';

const describePerformance =
  process.env.RUN_PERFORMANCE === '1' ? describe : describe.skip;

describePerformance('order query performance', () => {
  let dataSource: DataSource;
  let listOrders: ListOrdersUseCase;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const testApp = await createTestApp();
    dataSource = testApp.dataSource;
    listOrders = testApp.app.get(ListOrdersUseCase);
    close = () => testApp.app.close();
  });

  afterAll(async () => close());

  it('keeps the p95 filtered-list query below 250ms with the seeded volume', async () => {
    const rows = await dataSource.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM orders',
    );
    expect(rows[0]?.count ?? 0).toBeGreaterThanOrEqual(1_500);
    const measurements: number[] = [];
    for (let index = 0; index < 30; index += 1) {
      const started = performance.now();
      await listOrders.execute(
        { city: 'BOG', page: 1, limit: 100 },
        new Date(),
      );
      measurements.push(performance.now() - started);
    }
    measurements.sort((left, right) => left - right);
    const p95 =
      measurements[Math.ceil(measurements.length * 0.95) - 1] ?? Infinity;
    expect(p95).toBeLessThan(250);
  }, 30_000);
});
