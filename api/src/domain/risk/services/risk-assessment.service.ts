import type { CityCode, OrderStatus, Weather } from '@kuri/contracts';
import { RiskAssessment } from '../entities/risk-assessment';
import {
  CITY_TIME_ZONES,
  DEFAULT_RISK_RULE_CONFIG,
  type RiskOrderContext,
  type RiskRuleConfig,
} from '../value-objects/risk-rule-config';

const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'CREATED',
  'ACCEPTED',
  'COURIER_ASSIGNED',
  'PICKED_UP',
];
const WEATHER_CODES: readonly Weather[] = ['CLEAR', 'RAIN', 'STORM'];
const CITY_CODES: readonly CityCode[] = ['BOG', 'MEX', 'LIM'];

export class RiskAssessmentService {
  constructor(
    private readonly config: RiskRuleConfig = DEFAULT_RISK_RULE_CONFIG,
  ) {}

  assess(context: RiskOrderContext, now: Date): RiskAssessment {
    validateContext(context, now);
    let score = 0;
    const reasons: string[] = [];
    const elapsedStatus = minutesBetween(context.statusOccurredAt, now);
    const statusRule = this.config.statusDuration[context.currentStatus];
    if (statusRule && elapsedStatus > statusRule.minutes) {
      score += statusRule.points;
      reasons.push(
        `El pedido lleva ${formatMinutes(elapsedStatus)} en estado ${context.currentStatus}.`,
      );
    }

    const weatherPoints = this.config.weather[context.weather];
    if (weatherPoints > 0) {
      score += weatherPoints;
      reasons.push(
        `El clima actual es ${context.weather === 'RAIN' ? 'lluvia' : 'tormenta'}.`,
      );
    }

    const localTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: CITY_TIME_ZONES[context.city],
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const localMinutes =
      Number(localTime.find((part) => part.type === 'hour')?.value) * 60 +
      Number(localTime.find((part) => part.type === 'minute')?.value);
    if (
      (localMinutes >= 720 && localMinutes < 840) ||
      (localMinutes >= 1140 && localMinutes < 1260)
    ) {
      score += this.config.peakHour;
      reasons.push('La evaluación ocurre durante una hora pico local.');
    }

    if (context.currentStatus === 'ACCEPTED') {
      if (context.averagePreparationMinutes === null) {
        reasons.push(
          'No hay promedio de preparación disponible para el restaurante.',
        );
      } else {
        const prepMinutes = minutesBetween(
          context.acceptedAt ?? context.statusOccurredAt,
          now,
        );
        if (prepMinutes > context.averagePreparationMinutes) {
          score += this.config.prepOverAverage;
          reasons.push(
            `El restaurante lleva ${formatMinutes(prepMinutes)} preparando; su promedio es ${context.averagePreparationMinutes} minutos.`,
          );
          if (prepMinutes > context.averagePreparationMinutes * 1.5) {
            score += this.config.prepOverOneAndHalfAverage;
            reasons.push(
              `La preparación supera 1.5 veces el promedio de ${context.averagePreparationMinutes} minutos.`,
            );
          }
        }
      }
    }

    const remaining = minutesBetween(now, context.promisedAt);
    if (remaining < 10) {
      score += this.config.remainingUnderTen;
      reasons.push(
        `Quedan ${formatMinutes(remaining)} para la hora prometida.`,
      );
      if (remaining < 5) {
        score += this.config.remainingUnderFive;
        reasons.push('Quedan menos de 5 minutos para la hora prometida.');
      }
    }
    if (now.getTime() > context.promisedAt.getTime()) {
      score += this.config.delayed;
      reasons.push(
        'El pedido está retrasado: superó la hora prometida y aún no termina.',
      );
    }
    return RiskAssessment.create(score, reasons, this.config.thresholds);
  }
}

function validateContext(context: RiskOrderContext, now: Date): void {
  if (
    !context.orderId ||
    !CITY_CODES.includes(context.city) ||
    (!ACTIVE_STATUSES.includes(context.currentStatus) &&
      context.currentStatus !== 'DELIVERED' &&
      context.currentStatus !== 'CANCELLED') ||
    !WEATHER_CODES.includes(context.weather) ||
    !validDate(now) ||
    !validDate(context.statusOccurredAt) ||
    !validDate(context.promisedAt) ||
    (context.averagePreparationMinutes !== null &&
      context.averagePreparationMinutes <= 0)
  ) {
    throw new Error('Invalid risk assessment context.');
  }
}
function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}
function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60000;
}
function formatMinutes(minutes: number): string {
  return `${Math.max(0, Math.floor(minutes))} minutos`;
}
