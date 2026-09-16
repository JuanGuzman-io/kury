import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { LoadOrderDatasetUseCase } from '../../src/application/orders/use-cases/load-order-dataset.use-case';
import { generateDataset } from '../../src/infrastructure/cli/dataset-generator';
import { createTestApp } from '../support/test-app';

describe('dataset load integration', () => {
  let app: INestApplication;
  beforeAll(async () => ({ app } = await createTestApp()));
  afterAll(async () => app.close());

  it('loads generated events and makes a repeated source idempotent', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kuri-loader-'));
    try {
      const seed = Date.now();
      await generateDataset(seed, 12, directory);
      const loader = app.get(LoadOrderDatasetUseCase, { strict: false });
      const first = await loader.execute({
        eventsPath: join(directory, 'events.jsonl'),
        restaurantsPath: join(directory, 'restaurants.json'),
        couriersPath: join(directory, 'couriers.json'),
      });
      const repeated = await loader.execute({
        eventsPath: join(directory, 'events.jsonl'),
        restaurantsPath: join(directory, 'restaurants.json'),
        couriersPath: join(directory, 'couriers.json'),
      });
      expect(Number(first.applied_count)).toBeGreaterThan(0);
      expect(repeated.duplicate_count).toBe(repeated.total_events);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
