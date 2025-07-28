import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { CreateOrderDto, AddItemToOrderDto, UpdateOrderDto } from './dto';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly tableRepository;
    private readonly menuItemRepository;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, tableRepository: Repository<Table>, menuItemRepository: Repository<MenuItem>);
    create(createOrderDto: CreateOrderDto, waiterId: string): Promise<Order>;
    findAll(): Promise<Order[]>;
    findOne(id: string): Promise<Order>;
    findByTable(tableId: number): Promise<Order[]>;
    findActiveOrderByTable(tableId: number): Promise<Order | null>;
    addItemToOrder(orderId: string, addItemDto: AddItemToOrderDto): Promise<Order>;
    removeItemFromOrder(orderId: string, itemId: string): Promise<Order>;
    updateItemQuantity(orderId: string, itemId: string, newQuantity: number): Promise<Order>;
    update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order>;
    closeOrder(id: string): Promise<Order>;
    cancelOrder(id: string): Promise<Order>;
    remove(id: string): Promise<void>;
    private validateTableAvailability;
    private updateOrderTotal;
}
