import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { OrderItemsService } from './order-items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, User])
  ],
  providers: [OrderItemsService],
  exports: [OrderItemsService, TypeOrmModule],
})
export class OrderItemsModule {}