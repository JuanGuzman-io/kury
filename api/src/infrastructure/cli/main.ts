import 'reflect-metadata';
import { basename, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { LoadOrderDatasetUseCase } from '../../application/orders/use-cases/load-order-dataset.use-case';
import { generateDataset } from './dataset-generator';

function option(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function fromRepositoryRoot(path: string): string {
  const root =
    basename(process.cwd()) === 'api'
      ? resolve(process.cwd(), '..')
      : process.cwd();
  return resolve(root, path);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'generate') {
    const seed = Number(option('--seed', '20260915'));
    const orders = Number(option('--orders', '1500'));
    const out = fromRepositoryRoot(option('--out', 'api/data/generated')!);
    if (
      !Number.isSafeInteger(seed) ||
      !Number.isInteger(orders) ||
      orders < 1 ||
      orders > 100_000
    )
      throw new Error('Invalid generator options.');
    console.log(JSON.stringify(await generateDataset(seed, orders, out)));
    return;
  }
  if (command === 'load') {
    const eventsPath = option('--events');
    const restaurantsPath = option('--restaurants');
    const couriersPath = option('--couriers');
    if (!eventsPath || !restaurantsPath || !couriersPath)
      throw new Error('Load requires --events, --restaurants and --couriers.');
    const context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    try {
      console.log(
        JSON.stringify(
          await context
            .get(LoadOrderDatasetUseCase, { strict: false })
            .execute({
              eventsPath: fromRepositoryRoot(eventsPath),
              restaurantsPath: fromRepositoryRoot(restaurantsPath),
              couriersPath: fromRepositoryRoot(couriersPath),
            }),
        ),
      );
    } finally {
      await context.close();
    }
    return;
  }
  throw new Error('Usage: data:generate | data:load');
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unexpected CLI error.',
  );
  process.exitCode = 5;
});
