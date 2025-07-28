import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'Nome do item do cardápio',
    example: 'Pizza Margherita',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Nome do item é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Descrição detalhada do item',
    example: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  description: string;

  @ApiProperty({
    description: 'Preço do item em reais',
    example: 29.99,
    minimum: 0.01,
  })
  @IsNotEmpty({ message: 'Preço é obrigatório' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Preço deve ser um número com no máximo 2 casas decimais' },
  )
  @Min(0.01, { message: 'Preço deve ser maior que zero' })
  price: number;

  @ApiProperty({
    description: 'Categoria do item',
    example: 'Pizzas',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(50, { message: 'Categoria deve ter no máximo 50 caracteres' })
  category: string;

  @ApiPropertyOptional({
    description: 'Se o item está disponível para pedidos',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Disponibilidade deve ser um valor booleano' })
  isAvailable?: boolean = true;

  @ApiPropertyOptional({
    description: 'Tempo de preparo em minutos',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo de preparo deve ser um número' })
  @Min(1, { message: 'Tempo de preparo deve ser maior que 0' })
  preparationTime?: number;
}