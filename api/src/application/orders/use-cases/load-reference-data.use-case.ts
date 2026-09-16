import { Injectable } from '@nestjs/common';
import type {
  CourierReference,
  RestaurantReference,
} from '../ports/reference-data-repository.port';
import { TypeormReferenceDataRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-reference-data.repository';

@Injectable()
export class LoadReferenceDataUseCase {
  constructor(private readonly references: TypeormReferenceDataRepository) {}

  async execute(
    restaurants: RestaurantReference[],
    couriers: CourierReference[],
  ): Promise<void> {
    await this.references.upsertRestaurants(restaurants);
    await this.references.upsertCouriers(couriers);
  }
}
