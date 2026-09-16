import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { SupportAction, CompensationAlternative } from '@kuri/contracts';

export class SupportActionRequestDto {
  @ApiProperty() @IsString() @MaxLength(64) order_id!: string;
  @ApiProperty({ enum: ['CANCEL_ORDER', 'ISSUE_COUPON', 'REFUND'] })
  @IsIn(['CANCEL_ORDER', 'ISSUE_COUPON', 'REFUND'])
  action!: SupportAction;
  @ApiPropertyOptional({ enum: ['FULL_REFUND', 'WAIT_WITH_30_PERCENT_COUPON'] })
  @IsOptional()
  @IsIn(['FULL_REFUND', 'WAIT_WITH_30_PERCENT_COUPON'])
  alternative?: CompensationAlternative;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  missing_item_lines?: number[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotency_correlation?: string;
}
