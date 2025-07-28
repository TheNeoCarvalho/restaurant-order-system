import { IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({
    description: 'Número da mesa',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Número da mesa é obrigatório' })
  @IsNumber({}, { message: 'Número da mesa deve ser um número' })
  @Min(1, { message: 'Número da mesa deve ser maior que 0' })
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