import { RiskAssessmentService } from './risk-assessment.service';
import type { RiskOrderContext } from '../value-objects/risk-rule-config';

const now = new Date('2026-09-15T17:00:00.000Z');
function context(overrides: Partial<RiskOrderContext> = {}): RiskOrderContext {
  return {
    orderId: 'ord_test',
    city: 'BOG',
    currentStatus: 'ACCEPTED',
    statusOccurredAt: new Date('2026-09-15T16:45:00.000Z'),
    acceptedAt: new Date('2026-09-15T16:45:00.000Z'),
    promisedAt: new Date('2026-09-15T18:00:00.000Z'),
    weather: 'CLEAR',
    averagePreparationMinutes: 15,
    ...overrides,
  };
}

describe('RiskAssessmentService', () => {
  const service = new RiskAssessmentService();

  it('classifies deterministic weather and peak signals using city local time', () => {
    const result = service
      .assess(context({ weather: 'RAIN' }), now)
      .toContract();
    expect(result.level).toBe('LOW');
    expect(result.score).toBe(20);
    expect(result.reasons).toEqual([
      'El clima actual es lluvia.',
      'La evaluación ocurre durante una hora pico local.',
    ]);
  });

  it('uses strict boundaries for remaining time and status duration', () => {
    expect(
      service
        .assess(
          context({
            currentStatus: 'CREATED',
            statusOccurredAt: new Date('2026-09-15T16:55:00Z'),
            promisedAt: new Date('2026-09-15T17:10:00Z'),
          }),
          now,
        )
        .toContract().score,
    ).toBe(10);
    expect(
      service
        .assess(context({ promisedAt: new Date('2026-09-15T17:10:00Z') }), now)
        .toContract().score,
    ).toBe(10);
    expect(
      service
        .assess(context({ promisedAt: new Date('2026-09-15T17:09:00Z') }), now)
        .toContract().score,
    ).toBe(30);
  });

  it('adds preparation tiers cumulatively above average and 1.5 times average', () => {
    const result = service
      .assess(
        context({
          statusOccurredAt: new Date('2026-09-15T16:00:00Z'),
          acceptedAt: new Date('2026-09-15T16:00:00Z'),
        }),
        now,
      )
      .toContract();
    expect(result.score).toBe(45);
    expect(result.reasons).toHaveLength(3);
  });

  it('adds delayed score only after the promised instant', () => {
    expect(
      service.assess(context({ promisedAt: now }), now).toContract().score,
    ).toBe(50);
    expect(
      service
        .assess(context({ promisedAt: new Date(now.getTime() - 1) }), now)
        .toContract().score,
    ).toBe(90);
  });

  it('handles missing preparation data without inflating risk and explains it', () => {
    const result = service
      .assess(context({ averagePreparationMinutes: null }), now)
      .toContract();
    expect(result.score).toBe(10);
    expect(result.reasons).toContain(
      'No hay promedio de preparación disponible para el restaurante.',
    );
  });

  it('rejects invalid contexts and does not mutate input', () => {
    const input = context({});
    const snapshot = JSON.stringify(input);
    const result = service.assess(input, now).toContract();
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(() =>
      service.assess(context({ weather: 'BAD' as never }), now),
    ).toThrow('Invalid risk assessment context.');
    expect(
      result.reasons.every(
        (reason) => !/phone|document|full_name/i.test(reason),
      ),
    ).toBe(true);
  });
});
