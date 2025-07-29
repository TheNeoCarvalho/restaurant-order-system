import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { User } from '../users/entities/user.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderItemsModule } from '../order-items/order-items.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Table, MenuItem, User]),
    OrderItemsModule,
    forwardRef(() => WebsocketModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, TypeOrmModule],
})
export class OrdersModule {}