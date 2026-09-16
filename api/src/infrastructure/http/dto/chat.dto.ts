import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  conversation_id?: string;
  @ApiPropertyOptional({
    description: 'Informational only; does not authorize access.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  user_id?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  order_id?: string;
  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;
}

export class ChatResponseDto {
  @ApiProperty() conversation_id!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() intent?: string;
}
