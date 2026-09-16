import { createHash } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import { createInterface } from 'node:readline';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { parseOrderEventInput } from '../../../infrastructure/http/dto/order-event.dto';
import { LoadRunEntity } from '../../../infrastructure/database/typeorm/entities/order-ingestion.entities';
import { IngestOrderEventUseCase } from './ingest-order-event.use-case';
import { LoadReferenceDataUseCase } from './load-reference-data.use-case';
import type {
  CourierReference,
  RestaurantReference,
} from '../ports/reference-data-repository.port';

export interface LoadDatasetOptions {
  eventsPath: string;
  restaurantsPath: string;
  couriersPath: string;
}

@Injectable()
export class LoadOrderDatasetUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly references: LoadReferenceDataUseCase,
    private readonly ingest: IngestOrderEventUseCase,
  ) {}

  async execute(options: LoadDatasetOptions): Promise<Record<string, unknown>> {
    const started = Date.now();
    const [restaurantInput, courierInput] = await Promise.all([
      readJson<Array<Record<string, unknown>>>(options.restaurantsPath),
      readJson<Array<Record<string, unknown>>>(options.couriersPath),
    ]);
    const fingerprint = createHash('sha256')
      .update(await fs.readFile(options.eventsPath))
      .update(await fs.readFile(options.restaurantsPath))
      .update(await fs.readFile(options.couriersPath))
      .digest('hex');
    const restaurants = restaurantInput.map(toRestaurantReference);
    const couriers = courierInput.map(toCourierReference);
    await this.references.execute(restaurants, couriers);
    const run = await this.dataSource.manager.save(LoadRunEntity, {
      sourceFingerprint: fingerprint,
      status: 'RUNNING',
    });
    const counts = {
      total: 0,
      applied: 0,
      pending: 0,
      historical: 0,
      duplicate: 0,
      rejected: 0,
    };
    try {
      const reader = createInterface({
        input: createReadStream(options.eventsPath, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });
      for await (const line of reader) {
        if (!line.trim()) continue;
        counts.total += 1;
        try {
          const result = await this.ingest.execute(
            parseOrderEventInput(JSON.parse(line)),
            run.loadRunId,
          );
          if (result.outcome === 'APPLIED') counts.applied += 1;
          else if (result.outcome === 'PENDING') counts.pending += 1;
          else if (result.outcome === 'HISTORICAL') counts.historical += 1;
          else if (result.outcome === 'DUPLICATE') counts.duplicate += 1;
          else counts.rejected += 1;
        } catch {
          counts.rejected += 1;
        }
      }
      await this.dataSource.manager.update(
        LoadRunEntity,
        { loadRunId: run.loadRunId },
        {
          status: counts.rejected ? 'FAILED' : 'COMPLETED',
          totalEvents: counts.total,
          appliedCount: counts.applied,
          pendingCount: counts.pending,
          historicalCount: counts.historical,
          duplicateCount: counts.duplicate,
          rejectedCount: counts.rejected,
          completedAt: new Date(),
          failureSummary: counts.rejected
            ? 'One or more input records were rejected.'
            : null,
        },
      );
    } catch (error) {
      await this.dataSource.manager.update(
        LoadRunEntity,
        { loadRunId: run.loadRunId },
        {
          status: 'FAILED',
          completedAt: new Date(),
          failureSummary: 'Dataset load failed.',
        },
      );
      throw error;
    }
    return {
      load_run_id: run.loadRunId,
      source_fingerprint: fingerprint,
      total_events: counts.total,
      applied_count: counts.applied,
      pending_count: counts.pending,
      historical_count: counts.historical,
      duplicate_count: counts.duplicate,
      rejected_count: counts.rejected,
      duration_ms: Date.now() - started,
    };
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await fs.readFile(path, 'utf8')) as T;
}

function toRestaurantReference(
  input: Record<string, unknown>,
): RestaurantReference {
  return {
    restaurantId: String(input.restaurant_id),
    name: String(input.name),
    city: String(input.city),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    avgPrepMinutes: Number(input.avg_prep_minutes),
    rating: String(input.rating),
  };
}

function toCourierReference(input: Record<string, unknown>): CourierReference {
  return {
    courierId: String(input.courier_id),
    fullName: String(input.full_name),
    phone: String(input.phone),
    documentId: String(input.document_id),
    vehicle: String(input.vehicle),
    city: String(input.city),
    rating: String(input.rating),
  };
}
