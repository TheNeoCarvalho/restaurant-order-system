import { TableStatus } from '../../common/enums/table-status.enum';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';
export declare class PendingOrderItemDto {
    id: string;
    menuItemName: string;
    quantity: number;
    status: OrderItemStatus;
    specialInstructions?: string;
    createdAt: Date;
    estimatedPreparationTime?: number;
}
export declare class TableOverviewDto {
    id: number;
    number: number;
    capacity: number;
    status: TableStatus;
    activeOrderId?: string;
    waiterName?: string;
    orderTotal?: number;
    totalItems?: number;
    pendingItems?: number;
    itemsInPreparation?: number;
    readyItems?: number;
    pendingOrderItems?: PendingOrderItemDto[];
    orderOpenedAt?: Date;
    orderDurationMinutes?: number;
    hasPendingOrders: boolean;
    priority: 'low' | 'medium' | 'high';
}
export declare class TablesOverviewQueryDto {
    status?: TableStatus;
    hasPendingOrders?: boolean;
    sortBy?: 'number' | 'status' | 'orderDuration' | 'pendingItems';
    sortOrder?: 'ASC' | 'DESC';
    includeOrderDetails?: boolean;
}
