import type {
  RiskAssessment as RiskAssessmentContract,
  RiskLevel,
} from '@kuri/contracts';

export class RiskAssessment {
  private constructor(
    readonly level: RiskLevel,
    readonly score: number,
    readonly reasons: readonly string[],
  ) {}

  static create(
    score: number,
    reasons: readonly string[],
    thresholds: { medium: number; high: number },
  ): RiskAssessment {
    const level: RiskLevel =
      score >= thresholds.high
        ? 'HIGH'
        : score >= thresholds.medium
          ? 'MEDIUM'
          : 'LOW';
    return new RiskAssessment(level, score, Object.freeze([...reasons]));
  }

  toContract(): RiskAssessmentContract {
    return { level: this.level, score: this.score, reasons: [...this.reasons] };
  }
}
