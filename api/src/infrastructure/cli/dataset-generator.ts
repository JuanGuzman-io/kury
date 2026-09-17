import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { OrderEventInput, OrderStatus } from '@kuri/contracts';

/**
 * Small deterministic pseudo-random generator used to make synthetic datasets
 * reproducible. This is intentionally not cryptographically secure and must
 * not be used for secrets, identifiers with security requirements, or money.
 */
class Random {
  constructor(private state: number) {}

  /**
   * Advances the 32-bit generator state and returns a normalized value in
   * [0, 1). The bitwise operations intentionally emulate unsigned 32-bit
   * arithmetic so the same seed produces the same dataset on every run.
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let value = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** Returns an integer in the half-open range [0, max). */
  integer(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Selects one item uniformly by using its zero-based array index. */
  choice<T>(values: readonly T[]): T {
    return values[this.integer(values.length)];
  }
}

/**
 * Generates the deterministic synthetic dataset used when the business-case
 * files are unavailable. It creates reference data and order events, adds
 * controlled duplicate and out-of-order deliveries, then writes the external
 * Anexo A representation consumed by the dataset loader.
 */
export async function generateDataset(
  seed: number,
  orderCount: number,
  outputDirectory: string,
): Promise<Record<string, unknown>> {
  const random = new Random(seed);
  const cities = ['BOG', 'MEX', 'LIM'] as const;
  const weather = ['CLEAR', 'RAIN', 'STORM'] as const;
  const restaurants = cities.flatMap((city) =>
    Array.from({ length: 10 }, (_, index) => ({
      restaurant_id: `rst_${city.toLowerCase()}_${String(index + 1).padStart(4, '0')}`,
      name: `Restaurante ${city} ${index + 1}`,
      city,
      latitude:
        city === 'BOG'
          ? 4.6 + index / 100
          : city === 'MEX'
            ? 19.4 + index / 100
            : -12.0 + index / 100,
      longitude:
        city === 'BOG'
          ? -74.1 - index / 100
          : city === 'MEX'
            ? -99.1 - index / 100
            : -77.0 - index / 100,
      avg_prep_minutes: 12 + (index % 15),
      rating: 4.0 + (index % 10) / 10,
    })),
  );
  const couriers = cities.flatMap((city) =>
    Array.from({ length: 30 }, (_, index) => ({
      courier_id: `crr_${city.toLowerCase()}_${String(index + 1).padStart(4, '0')}`,
      full_name: `Courier ${city} ${index + 1}`,
      phone: `+570000${String(index).padStart(5, '0')}`,
      document_id: `${city}-${String(index + 1).padStart(8, '0')}`,
      vehicle: index % 2 ? 'BICYCLE' : 'MOTORCYCLE',
      city,
      rating: 4.0 + (index % 10) / 10,
    })),
  );
  const events: OrderEventInput[] = [];
  const base = Date.UTC(2026, 8, 15, 12, 0, 0);
  for (let index = 0; index < orderCount; index += 1) {
    const city = cities[index % cities.length];
    const restaurant = restaurants.filter((item) => item.city === city)[
      index % 10
    ];
    const courier = couriers.filter((item) => item.city === city)[index % 30];
    const id = `ord_${seed}_${String(index + 1).padStart(5, '0')}`;
    const created = new Date(base + index * 60_000);
    const price = 800 + random.integer(2200);
    const cancelled = index % 25 === 0;
    const delayed = !cancelled && index % 25 < 4;
    const active = !cancelled && (delayed || index % 10 === 0);
    const createdEvent: OrderEventInput = {
      event_id: `evt_${id}_created`,
      order_id: id,
      type: 'ORDER_CREATED',
      occurred_at: created.toISOString(),
      received_at: new Date(created.getTime() + 1000).toISOString(),
      payload: {
        user_id: `usr_${String(index + 1).padStart(5, '0')}`,
        city,
        restaurant_id: restaurant.restaurant_id,
        actor: 'USER',
        items: [
          {
            sku: 'meal_001',
            name: 'Plato principal',
            quantity: 1,
            unit_price: price / 100,
          },
        ],
        total_amount: price / 100,
        promised_at: new Date(
          created.getTime() + (delayed ? 30 : active ? 48 * 60 : 45) * 60_000,
        ).toISOString(),
        weather: weather[index % weather.length],
        dropoff: {
          lat: restaurant.latitude + 0.01,
          lng: restaurant.longitude - 0.01,
        },
      },
    };
    events.push(createdEvent);
    const statuses: Exclude<OrderStatus, 'CREATED'>[] = cancelled
      ? ['ACCEPTED', 'CANCELLED']
      : active
        ? ['ACCEPTED', 'COURIER_ASSIGNED']
        : ['ACCEPTED', 'COURIER_ASSIGNED', 'PICKED_UP', 'DELIVERED'];
    statuses.forEach((status, statusIndex) => {
      const occurred = new Date(
        created.getTime() + (statusIndex + 1) * 8 * 60_000,
      );
      events.push({
        event_id: `evt_${id}_${status.toLowerCase()}`,
        order_id: id,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: occurred.toISOString(),
        received_at: new Date(occurred.getTime() + 1000).toISOString(),
        payload: {
          status,
          actor: status === 'ACCEPTED' ? 'RESTAURANT' : 'SYSTEM',
          ...(status === 'COURIER_ASSIGNED'
            ? { courier_id: courier.courier_id }
            : {}),
          ...(status === 'CANCELLED'
            ? { cancel_reason: 'CUSTOMER_REQUEST' }
            : {}),
        },
      });
    });
  }
  const duplicates = events
    .filter((_, index) => index % 33 === 0)
    .map((event) => structuredClone(event));
  events.push(...duplicates);
  for (let index = 0; index < Math.floor(events.length * 0.05); index += 1) {
    const left = random.integer(events.length);
    const right = random.integer(events.length);
    [events[left], events[right]] = [events[right], events[left]];
  }
  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(
      join(outputDirectory, 'restaurants.json'),
      `${JSON.stringify(
        restaurants.map(({ latitude, longitude, ...restaurant }) => ({
          ...restaurant,
          location: { lat: latitude, lng: longitude },
        })),
        null,
        2,
      )}\n`,
    ),
    fs.writeFile(
      join(outputDirectory, 'couriers.json'),
      `${JSON.stringify(couriers, null, 2)}\n`,
    ),
    fs.writeFile(
      join(outputDirectory, 'events.jsonl'),
      `${events.map((event) => JSON.stringify(toAnnexEvent(event))).join('\n')}\n`,
    ),
  ]);
  return {
    seed,
    orders: orderCount,
    events: events.length,
    output: outputDirectory,
  };
}

function toAnnexEvent(event: OrderEventInput): Record<string, unknown> {
  // Keep generated files aligned with the external business-case schema while
  // the ingestion boundary normalizes them to the internal canonical shape.
  if (event.type === 'ORDER_CREATED') {
    const { actor, items, ...payload } = event.payload;
    void actor;
    return {
      event_id: event.event_id,
      order_id: event.order_id,
      type: event.type,
      occurred_at: event.occurred_at,
      received_at: event.received_at,
      payload: {
        ...payload,
        items: items.map(({ quantity, ...item }) => ({
          ...item,
          qty: quantity,
        })),
      },
    };
  }

  const { status, ...payload } = event.payload;
  return {
    event_id: event.event_id,
    order_id: event.order_id,
    type: event.type,
    status,
    occurred_at: event.occurred_at,
    received_at: event.received_at,
    payload,
  };
}
