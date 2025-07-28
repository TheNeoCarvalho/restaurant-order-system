import { ApiProperty } from '@nestjs/swagger';
import { MenuItem } from '../entities';

export class MenuItemResponseDto {
  @ApiProperty({
    description: 'ID único do item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do item do cardápio',
    example: 'Pizza Margherita',
  })
  name: string;

  @ApiProperty({
    description: 'Descrição detalhada do item',
    example: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
  })
  description: string;

  @ApiProperty({
    description: 'Preço do item em reais',
    example: 29.99,
  })
  price: number;

  @ApiProperty({
    description: 'Categoria do item',
    example: 'Pizzas',
  })
  category: string;

  @ApiProperty({
    description: 'Se o item está disponível para pedidos',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Tempo de preparo em minutos',
    example: 15,
    nullable: true,
  })
  preparationTime: number | null;

  @ApiProperty({
    description: 'Data de criação do item',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  constructor(menuItem: MenuItem) {
    this.id = menuItem.id;
    this.name = menuItem.name;
    this.description = menuItem.description;
    this.price = menuItem.price;
    this.category = menuItem.category;
    this.isAvailable = menuItem.isAvailable;
    this.preparationTime = menuItem.preparationTime;
    this.createdAt = menuItem.createdAt;
    this.updatedAt = menuItem.updatedAt;
  }
}