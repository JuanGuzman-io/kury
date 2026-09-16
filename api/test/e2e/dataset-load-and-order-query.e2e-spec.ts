import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { LoadOrderDatasetUseCase } from '../../src/application/orders/use-cases/load-order-dataset.use-case';
import { generateDataset } from '../../src/infrastructure/cli/dataset-generator';
import { createTestApp, getHttpServer } from '../support/test-app';

describe('critical dataset load to query flow', () => {
  let app: INestApplication;
  beforeAll(async () => ({ app } = await createTestApp()));
  afterAll(async () => app.close());

  it('loads, repeats idempotently, and exposes a safe timeline', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kuri-e2e-load-'));
    const seed = Date.now();
    try {
      await generateDataset(seed, 15, directory);
      const loader = app.get(LoadOrderDatasetUseCase, { strict: false });
      const options = {
        eventsPath: join(directory, 'events.jsonl'),
        restaurantsPath: join(directory, 'restaurants.json'),
        couriersPath: join(directory, 'couriers.json'),
      };
      const first = await loader.execute(options);
      const second = await loader.execute(options);
      expect(Number(first.applied_count)).toBeGreaterThan(0);
      expect(second.duplicate_count).toBe(second.total_events);
      const response = await request(getHttpServer(app))
        .get(`/api/v1/orders/ord_${seed}_00001`)
        .set('X-Kuri-Role', 'OPS')
        .expect(200);
      const body = response.body as { timeline: unknown[] };
      expect(body.timeline.length).toBeGreaterThan(0);
      expect(JSON.stringify(response.body)).not.toContain('document_id');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
