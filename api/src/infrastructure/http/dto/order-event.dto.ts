import type { OrderEventInput } from '@kuri/contracts';
import {
  cityCodes,
  eventActors,
  orderStatuses,
  weatherCodes,
} from '@kuri/contracts';
import type { IngestOrderEventCommand } from '../../../application/orders/dto/ingest-order-event.command';
import { eventContentHash } from '../../../application/orders/services/event-identity.service';
import type { OrderEvent } from '../../../domain/orders/entities/order-event';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';
import {
  assertItemTotal,
  toCents,
} from '../../../domain/orders/value-objects/money';

const idPattern = /^[A-Za-z0-9_-]{1,64}$/;

function object(value: unknown, label: string): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      `${label} must be an object.`,
      400,
    );
  }
  return value as Record<string, unknown>;
}

function assertDepth(value: unknown, depth = 0): void {
  if (depth > 8)
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      'Payload nesting exceeds the allowed depth.',
      400,
    );
  if (Array.isArray(value)) {
    for (const item of value) assertDepth(item, depth + 1);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>))
      assertDepth(item, depth + 1);
  }
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw new OrderDomainError(
        'VALIDATION_ERROR',
        `${label} contains an unsupported field: ${key}.`,
        400,
      );
    }
  }
}

function text(value: unknown, label: string, maxLength = 256): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      `${label} must be a non-empty string.`,
      400,
    );
  }
  return value;
}

function sourceId(value: unknown, label: string): string {
  const parsed = text(value, label, 64);
  if (!idPattern.test(parsed))
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      `${label} has an invalid format.`,
      400,
    );
  return parsed;
}

function instant(value: unknown, label: string): Date {
  const parsed = new Date(text(value, label, 64));
  if (Number.isNaN(parsed.getTime()))
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      `${label} must be an ISO timestamp.`,
      400,
    );
  return parsed;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  options: T,
  label: string,
): T[number] {
  if (typeof value !== 'string' || !options.includes(value)) {
    throw new OrderDomainError('VALIDATION_ERROR', `${label} is invalid.`, 400);
  }
  return value;
}

export function parseOrderEventInput(value: unknown): IngestOrderEventCommand {
  assertDepth(value);
  const body = object(value, 'Body');
  exactKeys(
    body,
    ['event_id', 'order_id', 'type', 'occurred_at', 'received_at', 'payload'],
    'Body',
  );
  const eventId = sourceId(body.event_id, 'event_id');
  const orderId = sourceId(body.order_id, 'order_id');
  const type = enumValue(
    body.type,
    ['ORDER_CREATED', 'ORDER_STATUS_CHANGED'] as const,
    'type',
  );
  const occurredAt = instant(body.occurred_at, 'occurred_at');
  const receivedAt = instant(body.received_at, 'received_at');
  const payload = object(body.payload, 'payload');

  if (type === 'ORDER_CREATED') {
    exactKeys(
      payload,
      [
        'user_id',
        'city',
        'restaurant_id',
        'actor',
        'items',
        'total_amount',
        'promised_at',
        'weather',
      ],
      'payload',
    );
    if (
      !Array.isArray(payload.items) ||
      payload.items.length === 0 ||
      payload.items.length > 100
    ) {
      throw new OrderDomainError(
        'VALIDATION_ERROR',
        'items must contain between 1 and 100 items.',
        400,
      );
    }
    const items = payload.items.map((value, index) => {
      const item = object(value, `items[${index}]`);
      exactKeys(
        item,
        ['sku', 'name', 'quantity', 'unit_price'],
        `items[${index}]`,
      );
      const quantity = item.quantity;
      if (
        !Number.isInteger(quantity) ||
        (quantity as number) < 1 ||
        (quantity as number) > 1000
      ) {
        throw new OrderDomainError(
          'VALIDATION_ERROR',
          `items[${index}].quantity must be a positive integer.`,
          400,
        );
      }
      return {
        sku: text(item.sku, `items[${index}].sku`, 128),
        name: text(item.name, `items[${index}].name`, 256),
        quantity: quantity as number,
        unitPriceCents: toCents(item.unit_price as string | number),
      };
    });
    const totalAmountCents = toCents(payload.total_amount as string | number);
    assertItemTotal(items, totalAmountCents);
    const promisedAt = instant(payload.promised_at, 'payload.promised_at');
    if (promisedAt <= occurredAt)
      throw new OrderDomainError(
        'VALIDATION_ERROR',
        'promised_at must be after occurred_at.',
        422,
      );
    const createdOrder = {
      userId: sourceId(payload.user_id, 'payload.user_id'),
      city: enumValue(payload.city, cityCodes, 'payload.city'),
      restaurantId: sourceId(payload.restaurant_id, 'payload.restaurant_id'),
      items,
      totalAmountCents,
      promisedAt,
      weather: enumValue(payload.weather, weatherCodes, 'payload.weather'),
    };
    const input: OrderEventInput = {
      event_id: eventId,
      order_id: orderId,
      type,
      occurred_at: occurredAt.toISOString(),
      received_at: receivedAt.toISOString(),
      payload: {
        user_id: createdOrder.userId,
        city: createdOrder.city,
        restaurant_id: createdOrder.restaurantId,
        actor: enumValue(payload.actor, eventActors, 'payload.actor'),
        items: items.map((item) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPriceCents / 100,
        })),
        total_amount: totalAmountCents / 100,
        promised_at: promisedAt.toISOString(),
        weather: createdOrder.weather,
      },
    };
    const event: OrderEvent = {
      eventId,
      orderId,
      type,
      status: null,
      actor: input.payload.actor,
      courierId: null,
      cancelReason: null,
      occurredAt,
      receivedAt,
      payload: {
        user_id: createdOrder.userId,
        city: createdOrder.city,
        restaurant_id: createdOrder.restaurantId,
        items: items.map((item) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
        })),
        total_amount_cents: totalAmountCents,
        promised_at: promisedAt.toISOString(),
        weather: createdOrder.weather,
      },
      contentHash: eventContentHash(input),
      ingestionSequence: 0,
      processingOutcome: 'PENDING_SEQUENCE',
      rejectionCode: null,
      createdOrder,
    };
    return { input, event };
  }

  exactKeys(
    payload,
    ['status', 'actor', 'courier_id', 'cancel_reason'],
    'payload',
  );
  const status = enumValue(
    payload.status,
    orderStatuses.filter((item) => item !== 'CREATED'),
    'payload.status',
  );
  const courierId =
    payload.courier_id === undefined
      ? null
      : sourceId(payload.courier_id, 'payload.courier_id');
  const cancelReason =
    payload.cancel_reason === undefined
      ? null
      : text(payload.cancel_reason, 'payload.cancel_reason', 128);
  if ((status === 'COURIER_ASSIGNED') !== Boolean(courierId)) {
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      'courier_id is required only for COURIER_ASSIGNED.',
      422,
    );
  }
  if ((status === 'CANCELLED') !== Boolean(cancelReason)) {
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      'cancel_reason is required only for CANCELLED.',
      422,
    );
  }
  const input: OrderEventInput = {
    event_id: eventId,
    order_id: orderId,
    type,
    occurred_at: occurredAt.toISOString(),
    received_at: receivedAt.toISOString(),
    payload: {
      status,
      actor: enumValue(payload.actor, eventActors, 'payload.actor'),
      ...(courierId ? { courier_id: courierId } : {}),
      ...(cancelReason ? { cancel_reason: cancelReason } : {}),
    },
  };
  return {
    input,
    event: {
      eventId,
      orderId,
      type,
      status,
      actor: input.payload.actor,
      courierId,
      cancelReason,
      occurredAt,
      receivedAt,
      payload: {
        status,
        actor: input.payload.actor,
        ...(courierId ? { courier_id: courierId } : {}),
        ...(cancelReason ? { cancel_reason: cancelReason } : {}),
      },
      contentHash: eventContentHash(input),
      ingestionSequence: 0,
      processingOutcome: 'PENDING_SEQUENCE',
      rejectionCode: null,
      createdOrder: null,
    },
  };
}
