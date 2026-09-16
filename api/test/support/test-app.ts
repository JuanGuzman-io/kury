import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import {
  CourierEntity,
  RestaurantEntity,
} from '../../src/infrastructure/database/typeorm/entities/order-ingestion.entities';

type SuperTestApp = Parameters<typeof request>[0];

export function getHttpServer(app: INestApplication): SuperTestApp {
  return app.getHttpServer() as SuperTestApp;
}

export async function createTestApp(): Promise<{
  app: INestApplication;
  dataSource: DataSource;
}> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { app, dataSource: app.get(DataSource) };
}

export async function insertReferences(
  dataSource: DataSource,
  suffix: string,
): Promise<{ restaurantId: string; courierId: string }> {
  const restaurantId = `rst_test_${suffix}`;
  const courierId = `crr_test_${suffix}`;
  await dataSource.manager.save(RestaurantEntity, {
    restaurantId,
    name: 'Restaurant test',
    city: 'BOG',
    latitude: 4.6,
    longitude: -74.1,
    avgPrepMinutes: 15,
    rating: '4.5',
  });
  await dataSource.manager.save(CourierEntity, {
    courierId,
    fullName: 'Courier private',
    phone: '+570000000',
    documentId: `doc_${suffix}`,
    vehicle: 'BICYCLE',
    city: 'BOG',
    rating: '4.5',
  });
  return { restaurantId, courierId };
}
