import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class AddItemToOrderDto {
  @IsUUID('4', { message: 'ID do item do menu deve ser um UUID válido' })
  menuItemId: string;

  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(1, { message: 'Quantidade deve ser maior que 0' })
  quantity: number;

  @IsOptional()
  @IsString({ message: 'Instruções especiais devem ser uma string' })
  @MaxLength(500, { message: 'Instruções especiais devem ter no máximo 500 caracteres' })
  specialInstructions?: string;
}