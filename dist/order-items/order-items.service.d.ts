import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { UpdateOrderItemStatusDto } from './dto';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { OrdersGateway } from '../websocket/orders.gateway';
export declare class OrderItemsService {
    private readonly orderItemRepository;
    private readonly userRepository;
    private readonly ordersGateway;
    constructor(orderItemRepository: Repository<OrderItem>, userRepository: Repository<User>, ordersGateway: OrdersGateway);
    findAll(): Promise<OrderItem[]>;
    findOne(id: string): Promise<OrderItem>;
    findByStatus(status: OrderItemStatus): Promise<OrderItem[]>;
    findPendingForKitchen(): Promise<OrderItem[]>;
    findReadyForDelivery(): Promise<OrderItem[]>;
    updateStatus(id: string, updateStatusDto: UpdateOrderItemStatusDto): Promise<OrderItem>;
    markAsInPreparation(id: string, userId: string): Promise<OrderItem>;
    markAsReady(id: string, userId: string): Promise<OrderItem>;
    markAsDelivered(id: string, userId: string): Promise<OrderItem>;
    cancelItem(id: string, userId: string): Promise<OrderItem>;
    getStatusHistory(id: string): Promise<OrderItem[]>;
    getStatusStatistics(): Promise<Record<OrderItemStatus, number>>;
    private validateUserPermission;
    findByOrder(orderId: string): Promise<OrderItem[]>;
    countByStatusForOrder(orderId: string): Promise<Record<OrderItemStatus, number>>;
    areAllItemsReadyForOrder(orderId: string): Promise<boolean>;
    hasPendingItemsForOrder(orderId: string): Promise<boolean>;
}
