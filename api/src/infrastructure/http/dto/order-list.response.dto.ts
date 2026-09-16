import { ApiProperty } from '@nestjs/swagger';
import { cityCodes, orderStatuses } from '@kuri/contracts';

export class RestaurantOperationalViewDto {
  @ApiProperty() restaurant_id!: string;
  @ApiProperty() name!: string;
}

export class OrderListItemDto {
  @ApiProperty() order_id!: string;
  @ApiProperty({ enum: cityCodes }) city!: string;
  @ApiProperty({ type: RestaurantOperationalViewDto })
  restaurant!: RestaurantOperationalViewDto;
  @ApiProperty({ nullable: true }) courier_id!: string | null;
  @ApiProperty({ enum: orderStatuses }) current_status!: string;
  @ApiProperty() delayed!: boolean;
  @ApiProperty({ format: 'date-time' }) promised_at!: string;
  @ApiProperty({ description: 'Integer cents' }) total_amount_cents!: number;
  @ApiProperty({ format: 'date-time' }) updated_at!: string;
}

export class PaginationDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderListItemDto] }) data!: OrderListItemDto[];
  @ApiProperty({ type: PaginationDto }) pagination!: PaginationDto;
}
