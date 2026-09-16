import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TypeormOrderTransaction {
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(
    orderId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        orderId,
      ]);
      return work(manager);
    });
  }
}
