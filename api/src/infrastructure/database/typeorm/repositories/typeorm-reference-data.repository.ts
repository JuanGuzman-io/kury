import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type {
  CourierReference,
  RestaurantReference,
} from '../../../../application/orders/ports/reference-data-repository.port';
import {
  CourierEntity,
  RestaurantEntity,
} from '../entities/order-ingestion.entities';

@Injectable()
export class TypeormReferenceDataRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsertRestaurants(
    restaurants: RestaurantReference[],
    manager?: EntityManager,
  ): Promise<void> {
    const target = manager ?? this.dataSource.manager;
    for (const restaurant of restaurants) {
      await target.upsert(RestaurantEntity, restaurant, ['restaurantId']);
    }
  }

  async upsertCouriers(
    couriers: CourierReference[],
    manager?: EntityManager,
  ): Promise<void> {
    const target = manager ?? this.dataSource.manager;
    for (const courier of couriers) {
      await target.upsert(CourierEntity, courier, ['courierId']);
    }
  }
}
