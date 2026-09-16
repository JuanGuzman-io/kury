import type { EventProcessingOutcome, OrderStatus } from '@kuri/contracts';
import type { OrderEvent } from '../entities/order-event';
import type { OrderProjection } from '../entities/order';

export interface ReducedEvent {
  eventId: string;
  outcome: EventProcessingOutcome;
  rejectionCode: string | null;
}

export interface TimelineReduction {
  projection: OrderProjection | null;
  events: ReducedEvent[];
}

const transitionOrder: OrderStatus[] = [
  'CREATED',
  'ACCEPTED',
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
];

const isTerminal = (status: OrderStatus) =>
  status === 'DELIVERED' || status === 'CANCELLED';

export function reduceOrderTimeline(
  input: readonly OrderEvent[],
): TimelineReduction {
  const ordered = [...input].sort(
    (left, right) =>
      left.occurredAt.getTime() - right.occurredAt.getTime() ||
      left.ingestionSequence - right.ingestionSequence,
  );
  const outcomes = new Map<string, ReducedEvent>();
  const creations = ordered.filter((event) => event.type === 'ORDER_CREATED');
  const creation = creations[0];

  for (const event of ordered) {
    outcomes.set(event.eventId, {
      eventId: event.eventId,
      outcome: 'PENDING_SEQUENCE',
      rejectionCode: null,
    });
  }

  if (!creation?.createdOrder) {
    return { projection: null, events: [...outcomes.values()] };
  }

  outcomes.set(creation.eventId, {
    eventId: creation.eventId,
    outcome: 'APPLIED',
    rejectionCode: null,
  });
  for (const duplicateCreation of creations.slice(1)) {
    outcomes.set(duplicateCreation.eventId, {
      eventId: duplicateCreation.eventId,
      outcome: 'REJECTED_CONFLICT',
      rejectionCode: 'MULTIPLE_ORDER_CREATED',
    });
  }

  let projection: OrderProjection = {
    orderId: creation.orderId,
    userId: creation.createdOrder.userId,
    city: creation.createdOrder.city,
    restaurantId: creation.createdOrder.restaurantId,
    courierId: null,
    currentStatus: 'CREATED',
    currentEventId: creation.eventId,
    statusOccurredAt: creation.occurredAt,
    promisedAt: creation.createdOrder.promisedAt,
    weather: creation.createdOrder.weather,
    totalAmountCents: creation.createdOrder.totalAmountCents,
    items: creation.createdOrder.items,
  };

  for (const event of ordered.filter(
    (candidate) => candidate.type === 'ORDER_STATUS_CHANGED',
  )) {
    const status = event.status;
    if (!status) {
      outcomes.set(event.eventId, {
        eventId: event.eventId,
        outcome: 'REJECTED_CONFLICT',
        rejectionCode: 'MISSING_STATUS',
      });
      continue;
    }

    if (isTerminal(projection.currentStatus)) {
      outcomes.set(event.eventId, {
        eventId: event.eventId,
        outcome:
          event.occurredAt > projection.statusOccurredAt
            ? 'REJECTED_CONFLICT'
            : 'HISTORICAL',
        rejectionCode:
          event.occurredAt > projection.statusOccurredAt
            ? 'TERMINAL_TRANSITION'
            : null,
      });
      continue;
    }

    if (status === 'CANCELLED') {
      projection = {
        ...projection,
        currentStatus: status,
        currentEventId: event.eventId,
        statusOccurredAt: event.occurredAt,
      };
      outcomes.set(event.eventId, {
        eventId: event.eventId,
        outcome: 'APPLIED',
        rejectionCode: null,
      });
      continue;
    }

    const expectedIndex = transitionOrder.indexOf(projection.currentStatus) + 1;
    const incomingIndex = transitionOrder.indexOf(status);
    if (incomingIndex === expectedIndex) {
      projection = {
        ...projection,
        courierId: event.courierId ?? projection.courierId,
        currentStatus: status,
        currentEventId: event.eventId,
        statusOccurredAt: event.occurredAt,
      };
      outcomes.set(event.eventId, {
        eventId: event.eventId,
        outcome: 'APPLIED',
        rejectionCode: null,
      });
      continue;
    }

    if (incomingIndex > expectedIndex) {
      outcomes.set(event.eventId, {
        eventId: event.eventId,
        outcome: 'PENDING_SEQUENCE',
        rejectionCode: null,
      });
      continue;
    }

    const sameInstant =
      event.occurredAt.getTime() === projection.statusOccurredAt.getTime();
    outcomes.set(event.eventId, {
      eventId: event.eventId,
      outcome: sameInstant ? 'REJECTED_CONFLICT' : 'HISTORICAL',
      rejectionCode: sameInstant ? 'TEMPORAL_CONFLICT' : null,
    });
  }

  return {
    projection,
    events: ordered.map((event) => outcomes.get(event.eventId)!),
  };
}
