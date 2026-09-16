import type { OrderEvent } from '../entities/order-event';
import { reduceOrderTimeline } from './order-timeline-reducer';

const created = (eventId: string, occurredAt: string): OrderEvent => ({
  eventId,
  orderId: 'ord_1',
  type: 'ORDER_CREATED',
  status: null,
  actor: 'USER',
  courierId: null,
  cancelReason: null,
  occurredAt: new Date(occurredAt),
  receivedAt: new Date(occurredAt),
  payload: {},
  contentHash: eventId,
  ingestionSequence: 1,
  processingOutcome: 'PENDING_SEQUENCE',
  rejectionCode: null,
  createdOrder: {
    userId: 'usr_1',
    city: 'BOG',
    restaurantId: 'rst_1',
    items: [],
    totalAmountCents: 1000,
    promisedAt: new Date('2026-09-15T13:00:00Z'),
    weather: 'RAIN',
  },
});

const status = (
  eventId: string,
  value: OrderEvent['status'],
  occurredAt: string,
  sequence: number,
): OrderEvent => ({
  eventId,
  orderId: 'ord_1',
  type: 'ORDER_STATUS_CHANGED',
  status: value,
  actor: 'SYSTEM',
  courierId: value === 'COURIER_ASSIGNED' ? 'crr_1' : null,
  cancelReason: value === 'CANCELLED' ? 'REQUEST' : null,
  occurredAt: new Date(occurredAt),
  receivedAt: new Date(occurredAt),
  payload: {},
  contentHash: eventId,
  ingestionSequence: sequence,
  processingOutcome: 'PENDING_SEQUENCE',
  rejectionCode: null,
  createdOrder: null,
});

describe('order timeline reducer', () => {
  it('uses occurred_at to produce the same projection from reordered input', () => {
    const events = [
      status('evt_assigned', 'COURIER_ASSIGNED', '2026-09-15T12:15:00Z', 3),
      created('evt_created', '2026-09-15T12:00:00Z'),
      status('evt_accepted', 'ACCEPTED', '2026-09-15T12:10:00Z', 2),
    ];
    const reduced = reduceOrderTimeline(events);
    expect(reduced.projection?.currentStatus).toBe('COURIER_ASSIGNED');
    expect(reduced.events.every((event) => event.outcome === 'APPLIED')).toBe(
      true,
    );
  });

  it('keeps terminal state closed and cancels from any nonterminal state', () => {
    const reduced = reduceOrderTimeline([
      created('evt_created', '2026-09-15T12:00:00Z'),
      status('evt_cancel', 'CANCELLED', '2026-09-15T12:05:00Z', 2),
      status('evt_after', 'ACCEPTED', '2026-09-15T12:10:00Z', 3),
    ]);
    expect(reduced.projection?.currentStatus).toBe('CANCELLED');
    expect(
      reduced.events.find((event) => event.eventId === 'evt_after'),
    ).toMatchObject({
      outcome: 'REJECTED_CONFLICT',
      rejectionCode: 'TERMINAL_TRANSITION',
    });
  });
});
