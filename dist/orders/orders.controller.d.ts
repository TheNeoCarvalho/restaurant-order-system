import { OrdersService } from './orders.service';
import { OrderItemsService } from '../order-items/order-items.service';
import { CreateOrderDto, AddItemToOrderDto, UpdateOrderDto } from './dto';
import { UpdateOrderItemStatusDto } from '../order-items/dto';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
export declare class OrdersController {
    private readonly ordersService;
    private readonly orderItemsService;
    constructor(ordersService: OrdersService, orderItemsService: OrderItemsService);
    create(createOrderDto: CreateOrderDto, req: any): Promise<import("./entities").Order>;
    findAll(): Promise<import("./entities").Order[]>;
    findOne(id: string): Promise<import("./entities").Order>;
    findByTable(tableId: number): Promise<import("./entities").Order[]>;
    findActiveOrderByTable(tableId: number): Promise<import("./entities").Order | null>;
    update(id: string, updateOrderDto: UpdateOrderDto): Promise<import("./entities").Order>;
    addItem(id: string, addItemDto: AddItemToOrderDto): Promise<import("./entities").Order>;
    removeItem(id: string, itemId: string): Promise<import("./entities").Order>;
    updateItemQuantity(id: string, itemId: string, quantity: number): Promise<import("./entities").Order>;
    closeOrder(id: string): Promise<import("./entities").Order>;
    cancelOrder(id: string): Promise<import("./entities").Order>;
    remove(id: string): Promise<void>;
    findAllItems(): Promise<import("../order-items").OrderItem[]>;
    findItemsByStatus(status: OrderItemStatus): Promise<import("../order-items").OrderItem[]>;
    findPendingForKitchen(): Promise<import("../order-items").OrderItem[]>;
    findReadyForDelivery(): Promise<import("../order-items").OrderItem[]>;
    findOneItem(itemId: string): Promise<import("../order-items").OrderItem>;
    updateItemStatus(itemId: string, updateStatusDto: UpdateOrderItemStatusDto, req: any): Promise<import("../order-items").OrderItem>;
    startPreparation(itemId: string, req: any): Promise<import("../order-items").OrderItem>;
    markReady(itemId: string, req: any): Promise<import("../order-items").OrderItem>;
    markDelivered(itemId: string, req: any): Promise<import("../order-items").OrderItem>;
    cancelItem(itemId: string, req: any): Promise<import("../order-items").OrderItem>;
    getStatusStatistics(): Promise<Record<OrderItemStatus, number>>;
    findOrderItems(id: string): Promise<import("../order-items").OrderItem[]>;
    countItemsByStatus(id: string): Promise<Record<OrderItemStatus, number>>;
    areAllItemsReady(id: string): Promise<{
        allReady: boolean;
    }>;
    hasPendingItems(id: string): Promise<{
        hasPending: boolean;
    }>;
}
