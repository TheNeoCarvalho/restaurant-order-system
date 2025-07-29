import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsNumber({}, { message: 'ID da mesa deve ser um número' })
  @ApiProperty({
    description: 'ID da mesa para a qual a comanda será criada',
    example: 1,
    type: Number
  })
  tableId: number;

  @IsArray({ message: 'Itens devem ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsOptional()
  @ApiProperty({
    description: 'Lista de itens iniciais da comanda (opcional)',
    type: [CreateOrderItemDto],
    required: false
  })
  items?: CreateOrderItemDto[];
}