import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { cityCodes, orderStatuses } from '@kuri/contracts';
import type { CityCode, OrderStatus } from '@kuri/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OrderListQueryDto {
  @ApiPropertyOptional({ enum: cityCodes })
  @IsOptional()
  @IsIn(cityCodes)
  city?: CityCode;

  @ApiPropertyOptional({ enum: orderStatuses })
  @IsOptional()
  @IsIn(orderStatuses)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'true=retrasados, false=no retrasados' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  delayed?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
