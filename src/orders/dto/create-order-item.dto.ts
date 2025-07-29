import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';
import { IsValidQuantity } from '../../common/validators';

export class CreateOrderItemDto {
  @IsUUID('4', { message: 'ID do item do menu deve ser um UUID válido' })
  menuItemId: string;

  @IsValidQuantity()
  quantity: number;

  @IsOptional()
  @IsString({ message: 'Instruções especiais devem ser uma string' })
  @MaxLength(500, { message: 'Instruções especiais devem ter no máximo 500 caracteres' })
  specialInstructions?: string;
}