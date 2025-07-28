import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome do item é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;

  @Column('text')
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNotEmpty({ message: 'Preço é obrigatório' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Preço deve ser um número com no máximo 2 casas decimais' },
  )
  @Min(0.01, { message: 'Preço deve ser maior que zero' })
  price: number;

  @Column()
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(50, { message: 'Categoria deve ter no máximo 50 caracteres' })
  category: string;

  @Column({ default: true })
  @IsBoolean({ message: 'Disponibilidade deve ser um valor booleano' })
  isAvailable: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo de preparo deve ser um número' })
  @Min(1, { message: 'Tempo de preparo deve ser maior que 0' })
  preparationTime: number; // em minutos

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}