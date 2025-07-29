import { IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidTableNumber } from '../../common/validators';

export class CreateTableDto {
  @ApiProperty({
    description: 'Número da mesa',
    example: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty({ message: 'Número da mesa é obrigatório' })
  @IsValidTableNumber()
  number: number;

  @ApiPropertyOptional({
    description: 'Capacidade da mesa (número de pessoas)',
    example: 4,
    minimum: 1,
    default: 4,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Capacidade deve ser um número' })
  @Min(1, { message: 'Capacidade deve ser maior que 0' })
  capacity?: number;
}