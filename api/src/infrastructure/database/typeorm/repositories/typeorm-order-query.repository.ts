import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import type {
  OrderDetailResponse,
  OrderListItem,
  OrderListQuery,
} from '@kuri/contracts';
import { isOrderDelayed } from '../../../../application/orders/services/delayed-order.policy';
import type { OrderQueryRepository } from '../../../../application/orders/ports/order-query-repository.port';
import {
  OrderEntity,
  RestaurantEntity,
} from '../entities/order-ingestion.entities';
import { TypeormOrderEventRepository } from './typeorm-order-event.repository';
import { TypeormOrderRepository } from './typeorm-order.repository';

type ListRow = {
  order_id: string;
  city: string;
  restaurant_id: string;
  restaurant_name: string;
  courier_id: string | null;
  current_status: string;
  promised_at: Date;
  total_amount_cents: string;
  updated_at: Date;
};

@Injectable()
export class TypeormOrderQueryRepository implements OrderQueryRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: TypeormOrderRepository,
    private readonly events: TypeormOrderEventRepository,
  ) {}

  async findDetail(orderId: string): Promise<OrderDetailResponse | null> {
    return this.dataSource.transaction(async (manager) => {
      const details = await this.orders.findDetails(manager, orderId);
      if (!details) return null;
      const [restaurant, timeline] = await Promise.all([
        manager.findOneBy(RestaurantEntity, {
          restaurantId: details.order.restaurantId,
        }),
        this.events.findByOrderId(manager, orderId),
      ]);
      return {
        order_id: details.order.orderId,
        user_id: details.order.userId,
        city: details.order.city as OrderDetailResponse['city'],
        restaurant: {
          restaurant_id: details.order.restaurantId,
          name: restaurant?.name ?? 'Unknown restaurant',
        },
        courier_id: details.order.courierId,
        current_status: details.order
          .currentStatus as OrderDetailResponse['current_status'],
        delayed: isOrderDelayed(
          details.order.promisedAt,
          details.order.currentStatus,
          new Date(),
        ),
        promised_at: details.order.promisedAt.toISOString(),
        total_amount_cents: Number(details.order.totalAmountCents),
        updated_at: details.order.updatedAt.toISOString(),
        current_event_id: details.order.currentEventId,
        status_occurred_at: details.order.statusOccurredAt.toISOString(),
        weather: details.order.weather as OrderDetailResponse['weather'],
        created_at: details.order.createdAt.toISOString(),
        items: details.items.map((item) => ({
          line_number: item.lineNumber,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit_price_cents: Number(item.unitPriceCents),
        })),
        timeline: timeline.map((event) => ({
          event_id: event.eventId,
          type: event.type,
          status: event.status,
          actor: event.actor,
          occurred_at: event.occurredAt.toISOString(),
          received_at: event.receivedAt.toISOString(),
          courier_id: event.courierId,
          processing_outcome: event.processingOutcome,
          rejection_code: event.rejectionCode,
        })),
      };
    });
  }

  async findPage(
    query: OrderListQuery,
    evaluationInstant: Date,
  ): Promise<{ data: OrderListItem[]; total: number }> {
    return this.dataSource.transaction(async (manager) => {
      const builder = manager
        .createQueryBuilder(OrderEntity, 'o')
        .innerJoin(RestaurantEntity, 'r', 'r.restaurant_id = o.restaurant_id')
        .select([
          'o.order_id AS order_id',
          'o.city AS city',
          'o.restaurant_id AS restaurant_id',
          'r.name AS restaurant_name',
          'o.courier_id AS courier_id',
          'o.current_status AS current_status',
          'o.promised_at AS promised_at',
          'o.total_amount_cents AS total_amount_cents',
          'o.updated_at AS updated_at',
        ])
        .orderBy('o.created_at', 'DESC')
        .addOrderBy('o.order_id', 'ASC')
        .offset((query.page - 1) * query.limit)
        .limit(query.limit);
      applyFilters(builder, query, evaluationInstant);
      const rawRows: unknown = await builder.getRawMany();
      const rows = rawRows as ListRow[];
      const countBuilder = builder
        .clone()
        .select('COUNT(o.order_id)', 'count')
        .orderBy()
        .offset(undefined)
        .limit(undefined);
      const countRow = (await countBuilder.getRawOne()) as { count: string };
      return {
        data: rows.map((row) => ({
          order_id: row.order_id,
          city: row.city as OrderListItem['city'],
          restaurant: {
            restaurant_id: row.restaurant_id,
            name: row.restaurant_name,
          },
          courier_id: row.courier_id,
          current_status: row.current_status as OrderListItem['current_status'],
          delayed: isOrderDelayed(
            new Date(row.promised_at),
            row.current_status,
            evaluationInstant,
          ),
          promised_at: new Date(row.promised_at).toISOString(),
          total_amount_cents: Number(row.total_amount_cents),
          updated_at: new Date(row.updated_at).toISOString(),
        })),
        total: Number(countRow.count),
      };
    });
  }
}

function applyFilters(
  builder: SelectQueryBuilder<OrderEntity>,
  query: OrderListQuery,
  evaluationInstant: Date,
): void {
  if (query.city) builder.andWhere('o.city = :city', { city: query.city });
  if (query.status)
    builder.andWhere('o.current_status = :status', { status: query.status });
  if (query.delayed === true) {
    builder.andWhere('o.promised_at < :evaluationInstant', {
      evaluationInstant,
    });
    builder.andWhere('o.current_status != :delivered', {
      delivered: 'DELIVERED',
    });
  } else if (query.delayed === false) {
    builder.andWhere(
      '(o.promised_at >= :evaluationInstant OR o.current_status = :delivered)',
      { evaluationInstant, delivered: 'DELIVERED' },
    );
  }
}
