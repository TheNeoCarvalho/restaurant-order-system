import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Table } from '../../tables/entities/table.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from '../../order-items/entities/order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Table, { eager: true })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'table_id' })
  tableId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'waiter_id' })
  waiter: User;

  @Column({ name: 'waiter_id' })
  waiterId: string;

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { 
    cascade: true,
    eager: true 
  })
  items: OrderItem[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.OPEN,
  })
  status: OrderStatus;

  @Column('decimal', { 
    precision: 10, 
    scale: 2, 
    default: 0,
    name: 'total_amount'
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor total deve ser um número com no máximo 2 casas decimais' },
  )
  @Min(0, { message: 'Valor total deve ser maior ou igual a zero' })
  totalAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ nullable: true, name: 'closed_at' })
  @IsOptional()
  closedAt: Date;

  // Método para calcular o total automaticamente
  calculateTotal(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }
    
    return this.items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  // Método para atualizar o total
  updateTotal(): void {
    this.totalAmount = this.calculateTotal();
  }
}