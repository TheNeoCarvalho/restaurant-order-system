import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { MenuItem } from '../../menu/entities/menu-item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => MenuItem, { eager: true })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @Column()
  @IsNotEmpty({ message: 'Quantidade é obrigatória' })
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(1, { message: 'Quantidade deve ser maior que 0' })
  quantity: number;

  @Column('decimal', { 
    precision: 10, 
    scale: 2,
    name: 'unit_price'
  })
  @IsNotEmpty({ message: 'Preço unitário é obrigatório' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Preço unitário deve ser um número com no máximo 2 casas decimais' },
  )
  @Min(0.01, { message: 'Preço unitário deve ser maior que zero' })
  unitPrice: number;

  @Column('text', { nullable: true, name: 'special_instructions' })
  @IsOptional()
  @IsString({ message: 'Instruções especiais devem ser uma string' })
  @MaxLength(500, { message: 'Instruções especiais devem ter no máximo 500 caracteres' })
  specialInstructions: string;

  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.PENDING,
  })
  status: OrderItemStatus;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'status_updated_by' })
  statusUpdatedBy: User;

  @Column({ nullable: true, name: 'status_updated_by' })
  statusUpdatedById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Método para calcular o subtotal do item
  getSubtotal(): number {
    return this.quantity * this.unitPrice;
  }

  // Método para verificar se o item pode ser cancelado
  canBeCancelled(): boolean {
    return this.status === OrderItemStatus.PENDING || 
           this.status === OrderItemStatus.IN_PREPARATION;
  }

  // Método para verificar se o item pode ter status atualizado
  canUpdateStatus(newStatus: OrderItemStatus): boolean {
    const statusFlow: Record<OrderItemStatus, OrderItemStatus[]> = {
      [OrderItemStatus.PENDING]: [OrderItemStatus.IN_PREPARATION, OrderItemStatus.CANCELLED],
      [OrderItemStatus.IN_PREPARATION]: [OrderItemStatus.READY, OrderItemStatus.CANCELLED],
      [OrderItemStatus.READY]: [OrderItemStatus.DELIVERED],
      [OrderItemStatus.DELIVERED]: [],
      [OrderItemStatus.CANCELLED]: [],
    };

    return statusFlow[this.status]?.includes(newStatus) || false;
  }
}