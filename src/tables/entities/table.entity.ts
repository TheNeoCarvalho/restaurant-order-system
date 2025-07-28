import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { TableStatus } from '../../common/enums/table-status.enum';

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Número da mesa é obrigatório' })
  @IsNumber({}, { message: 'Número da mesa deve ser um número' })
  @Min(1, { message: 'Número da mesa deve ser maior que 0' })
  number: number;

  @Column({ default: 4 })
  @IsNumber({}, { message: 'Capacidade deve ser um número' })
  @Min(1, { message: 'Capacidade deve ser maior que 0' })
  capacity: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamento com pedidos será adicionado quando implementarmos o módulo de orders
  // @OneToMany(() => Order, order => order.table)
  // orders: Order[];
}