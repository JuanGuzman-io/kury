import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import type {
  AtRiskOrderResponse,
  OrderDetailResponse,
  OrderListItem,
  OrderListQuery,
  RiskOrderDetail,
  RiskOrderListItem,
  Weather,
} from '@kuri/contracts';
import { isOrderDelayed } from '../../../../application/orders/services/delayed-order.policy';
import type { OrderQueryRepository } from '../../../../application/orders/ports/order-query-repository.port';
import {
  OrderEntity,
  RestaurantEntity,
} from '../entities/order-ingestion.entities';
import { TypeormOrderEventRepository } from './typeorm-order-event.repository';
import { TypeormOrderRepository } from './typeorm-order.repository';
import { RiskAssessmentService } from '../../../../domain/risk/services/risk-assessment.service';
import { ACTIVE_ORDER_STATUSES } from '../../../../domain/risk/value-objects/risk-rule-config';

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
  status_occurred_at?: Date;
  avg_prep_minutes?: number;
  weather?: string;
};

@Injectable()
export class TypeormOrderQueryRepository implements OrderQueryRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: TypeormOrderRepository,
    private readonly events: TypeormOrderEventRepository,
    private readonly risk: RiskAssessmentService,
  ) {}

  async findDetail(orderId: string): Promise<RiskOrderDetail | null> {
    return this.dataSource.transaction(async (manager) => {
      const details = await this.orders.findDetails(manager, orderId);
      if (!details) return null;
      const [restaurant, timeline] = await Promise.all([
        manager.findOneBy(RestaurantEntity, {
          restaurantId: details.order.restaurantId,
        }),
        this.events.findByOrderId(manager, orderId),
      ]);
      const response: OrderDetailResponse = {
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
      const acceptedEvent = timeline.find(
        (event) => event.status === 'ACCEPTED',
      );
      return {
        ...response,
        risk: this.risk
          .assess(
            {
              orderId: details.order.orderId,
              city: details.order.city as RiskOrderDetail['city'],
              currentStatus: details.order
                .currentStatus as RiskOrderDetail['current_status'],
              statusOccurredAt: details.order.statusOccurredAt,
              acceptedAt: acceptedEvent?.occurredAt ?? null,
              promisedAt: details.order.promisedAt,
              weather: details.order.weather as RiskOrderDetail['weather'],
              averagePreparationMinutes: restaurant?.avgPrepMinutes ?? null,
            },
            new Date(),
          )
          .toContract(),
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

  async findAtRiskPage(
    query: OrderListQuery,
    evaluationInstant: Date,
  ): Promise<AtRiskOrderResponse> {
    const result = await this.dataSource.transaction(async (manager) => {
      const builder = manager
        .createQueryBuilder(OrderEntity, 'o')
        .innerJoin(RestaurantEntity, 'r', 'r.restaurant_id = o.restaurant_id')
        .select([
          'o.order_id AS order_id',
          'o.city AS city',
          'o.restaurant_id AS restaurant_id',
          'r.name AS restaurant_name',
          'r.avg_prep_minutes AS avg_prep_minutes',
          'o.courier_id AS courier_id',
          'o.current_status AS current_status',
          'o.weather AS weather',
          'o.status_occurred_at AS status_occurred_at',
          'o.promised_at AS promised_at',
          'o.total_amount_cents AS total_amount_cents',
          'o.updated_at AS updated_at',
        ])
        .where('o.current_status IN (:...activeStatuses)', {
          activeStatuses: ACTIVE_ORDER_STATUSES,
        });
      applyFilters(builder, query, evaluationInstant);
      const rows = await builder.getRawMany<ListRow>();
      const items = rows.map((row): RiskOrderListItem => {
        const risk = this.risk
          .assess(
            {
              orderId: row.order_id,
              city: row.city as RiskOrderListItem['city'],
              currentStatus:
                row.current_status as RiskOrderListItem['current_status'],
              statusOccurredAt: new Date(row.status_occurred_at!),
              acceptedAt: null,
              promisedAt: new Date(row.promised_at),
              weather: (row.weather ?? 'CLEAR') as Weather,
              averagePreparationMinutes: Number(row.avg_prep_minutes),
            },
            evaluationInstant,
          )
          .toContract();
        return {
          order_id: row.order_id,
          city: row.city as RiskOrderListItem['city'],
          restaurant: {
            restaurant_id: row.restaurant_id,
            name: row.restaurant_name,
          },
          courier_id: row.courier_id,
          current_status:
            row.current_status as RiskOrderListItem['current_status'],
          delayed: isOrderDelayed(
            new Date(row.promised_at),
            row.current_status,
            evaluationInstant,
          ),
          promised_at: new Date(row.promised_at).toISOString(),
          total_amount_cents: Number(row.total_amount_cents),
          updated_at: new Date(row.updated_at).toISOString(),
          risk,
        };
      });
      items.sort(
        (a, b) =>
          riskRank(b.risk.level) - riskRank(a.risk.level) ||
          b.risk.score - a.risk.score ||
          a.promised_at.localeCompare(b.promised_at) ||
          a.order_id.localeCompare(b.order_id),
      );
      return { items, total: items.length };
    });
    const start = (query.page - 1) * query.limit;
    return {
      data: result.items.slice(start, start + query.limit),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages:
          result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
      },
    };
  }
}

function riskRank(level: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  return level === 'HIGH' ? 3 : level === 'MEDIUM' ? 2 : 1;
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
