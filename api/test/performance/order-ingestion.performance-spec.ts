import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { LoadOrderDatasetUseCase } from '../../src/application/orders/use-cases/load-order-dataset.use-case';
import { generateDataset } from '../../src/infrastructure/cli/dataset-generator';

const describePerformance =
  process.env.RUN_PERFORMANCE === '1' ? describe : describe.skip;

describePerformance('order ingestion performance', () => {
  it('loads approximately 1500 orders in under 60 seconds', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kuri-performance-'));
    const seed = Date.now();
    const started = Date.now();
    const context = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    try {
      await generateDataset(seed, 1500, directory);
      await context.get(LoadOrderDatasetUseCase, { strict: false }).execute({
        eventsPath: join(directory, 'events.jsonl'),
        restaurantsPath: join(directory, 'restaurants.json'),
        couriersPath: join(directory, 'couriers.json'),
      });
      expect(Date.now() - started).toBeLessThan(60_000);
    } finally {
      await context.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 70_000);
});
