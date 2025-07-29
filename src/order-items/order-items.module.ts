import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { OrderItemsService } from './order-items.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, User]),
    forwardRef(() => WebsocketModule),
  ],
  providers: [OrderItemsService],
  exports: [OrderItemsService, TypeOrmModule],
})
export class OrderItemsModule {}