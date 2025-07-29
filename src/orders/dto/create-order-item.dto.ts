import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';
import { IsValidQuantity } from '../../common/validators';

export class CreateOrderItemDto {
  @IsUUID('4', { message: 'ID do item do menu deve ser um UUID válido' })
  @ApiProperty({
    description: 'ID do item do cardápio',
    example: 'uuid-string',
    format: 'uuid'
  })
  menuItemId: string;

  @IsValidQuantity()
  @ApiProperty({
    description: 'Quantidade do item',
    example: 2,
    minimum: 1,
    type: Number
  })
  quantity: number;

  @IsOptional()
  @IsString({ message: 'Instruções especiais devem ser uma string' })
  @MaxLength(500, { message: 'Instruções especiais devem ter no máximo 500 caracteres' })
  @ApiProperty({
    description: 'Instruções especiais para o preparo do item',
    example: 'Sem cebola, ponto da carne mal passado',
    required: false,
    maxLength: 500
  })
  specialInstructions?: string;
}