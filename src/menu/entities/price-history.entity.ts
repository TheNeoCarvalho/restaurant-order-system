import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MenuItem } from './menu-item.entity';

@Entity('menu_item_price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column('uuid')
  menuItemId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  oldPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  newPrice: number;

  @Column('uuid')
  changedBy: string; // User ID who made the change

  @Column({ nullable: true })
  reason: string; // Optional reason for price change

  @CreateDateColumn()
  changedAt: Date;
}