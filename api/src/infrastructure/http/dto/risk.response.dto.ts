import { ApiProperty } from '@nestjs/swagger';
import { riskLevels } from '@kuri/contracts';

export class RiskResponseDto {
  @ApiProperty({ enum: riskLevels }) level!: string;
  @ApiProperty({ minimum: 0 }) score!: number;
  @ApiProperty({
    type: [String],
    description: 'Razones legibles para Operaciones',
  })
  reasons!: string[];
}
