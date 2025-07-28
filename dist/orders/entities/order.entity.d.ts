import { OrderStatus } from '../../common/enums/order-status.enum';
import { Table } from '../../tables/entities/table.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from '../../order-items/entities/order-item.entity';
export declare class Order {
    id: string;
    table: Table;
    tableId: number;
    waiter: User;
    waiterId: string;
    items: OrderItem[];
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date;
    calculateTotal(): number;
    updateTotal(): void;
}
