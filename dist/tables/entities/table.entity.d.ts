import { TableStatus } from '../../common/enums/table-status.enum';
import { Order } from '../../orders/entities/order.entity';
export declare class Table {
    id: number;
    number: number;
    capacity: number;
    status: TableStatus;
    createdAt: Date;
    updatedAt: Date;
    orders: Order[];
}
