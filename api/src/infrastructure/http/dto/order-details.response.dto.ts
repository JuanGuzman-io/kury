import { ApiProperty } from '@nestjs/swagger';
import { orderStatuses, weatherCodes } from '@kuri/contracts';
import { OrderListItemDto } from './order-list.response.dto';
import { RiskResponseDto } from './risk.response.dto';

export class OrderItemResponseDto {
  @ApiProperty() line_number!: number;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unit_price_cents!: number;
}

export class TimelineEventResponseDto {
  @ApiProperty() event_id!: string;
  @ApiProperty({ enum: ['ORDER_CREATED', 'ORDER_STATUS_CHANGED'] })
  type!: string;
  @ApiProperty({ enum: orderStatuses, nullable: true }) status!: string | null;
  @ApiProperty() actor!: string;
  @ApiProperty({ format: 'date-time' }) occurred_at!: string;
  @ApiProperty({ format: 'date-time' }) received_at!: string;
  @ApiProperty({ nullable: true }) courier_id!: string | null;
  @ApiProperty() processing_outcome!: string;
  @ApiProperty({ nullable: true }) rejection_code!: string | null;
}

export class OrderDetailsResponseDto extends OrderListItemDto {
  @ApiProperty({ type: RiskResponseDto }) risk!: RiskResponseDto;
  @ApiProperty() user_id!: string;
  @ApiProperty() current_event_id!: string;
  @ApiProperty({ format: 'date-time' }) status_occurred_at!: string;
  @ApiProperty({ enum: weatherCodes }) weather!: string;
  @ApiProperty({ format: 'date-time' }) created_at!: string;
  @ApiProperty({ type: [OrderItemResponseDto] }) items!: OrderItemResponseDto[];
  @ApiProperty({ type: [TimelineEventResponseDto] })
  timeline!: TimelineEventResponseDto[];
}
