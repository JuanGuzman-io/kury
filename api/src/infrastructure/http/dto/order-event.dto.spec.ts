import { parseOrderEventInput } from './order-event.dto';

describe('order event input compatibility', () => {
  it('accepts the event shape from the business-case annex', () => {
    const command = parseOrderEventInput({
      event_id: 'evt_annex_created',
      order_id: 'ord_annex_001',
      type: 'ORDER_CREATED',
      occurred_at: '2026-09-10T19:30:02Z',
      received_at: '2026-09-10T19:30:03Z',
      payload: {
        user_id: 'usr_20981',
        city: 'BOG',
        restaurant_id: 'res_0088',
        items: [
          {
            sku: 'burger_classic',
            name: 'Hamburguesa clásica',
            qty: 2,
            unit_price: 6.5,
          },
          {
            sku: 'fries_large',
            name: 'Papas grandes',
            qty: 1,
            unit_price: 2.9,
          },
        ],
        total_amount: 15.9,
        promised_at: '2026-09-10T20:10:00Z',
        dropoff: { lat: 4.671, lng: -74.048 },
        weather: 'RAIN',
      },
    });

    const inputPayload = command.input.payload as {
      actor: string;
      items: Array<{ quantity: number }>;
    };
    const eventPayload = command.event.payload as {
      dropoff: { lat: number; lng: number };
    };
    expect(inputPayload.actor).toBe('USER');
    expect(inputPayload.items[0].quantity).toBe(2);
    expect(eventPayload.dropoff).toEqual({ lat: 4.671, lng: -74.048 });
  });

  it('accepts status at the event root from the business-case annex', () => {
    const command = parseOrderEventInput({
      event_id: 'evt_annex_status',
      order_id: 'ord_annex_001',
      type: 'ORDER_STATUS_CHANGED',
      status: 'COURIER_ASSIGNED',
      occurred_at: '2026-09-10T19:42:11Z',
      received_at: '2026-09-10T19:42:15Z',
      payload: {
        courier_id: 'cou_0417',
        actor: 'SYSTEM',
      },
    });

    expect(command.event.status).toBe('COURIER_ASSIGNED');
    expect(command.event.courierId).toBe('cou_0417');
  });
});
