import { OrderItemStatus } from '../../common/enums/order-item-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { MenuItem } from '../../menu/entities/menu-item.entity';
import { User } from '../../users/entities/user.entity';
export declare class OrderItem {
    id: string;
    order: Order;
    orderId: string;
    menuItem: MenuItem;
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    specialInstructions: string;
    status: OrderItemStatus;
    statusUpdatedBy: User;
    statusUpdatedById: string;
    createdAt: Date;
    updatedAt: Date;
    getSubtotal(): number;
    canBeCancelled(): boolean;
    canUpdateStatus(newStatus: OrderItemStatus): boolean;
}
