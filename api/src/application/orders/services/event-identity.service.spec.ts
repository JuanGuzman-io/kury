import { eventContentHash } from './event-identity.service';

describe('event identity', () => {
  it('is stable regardless of object key order and changes for mutated content', () => {
    expect(eventContentHash({ b: 2, a: { z: true } })).toBe(
      eventContentHash({ a: { z: true }, b: 2 }),
    );
    expect(eventContentHash({ event_id: 'evt_1', amount: 100 })).not.toBe(
      eventContentHash({ event_id: 'evt_1', amount: 101 }),
    );
  });
});
