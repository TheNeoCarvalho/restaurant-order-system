import { Order } from '../entities/order.entity';
import { OrderSummary } from '../interfaces';
export declare class CloseOrderResponseDto {
    message: string;
    order: Order;
    summary: OrderSummary;
    closedBy: {
        userId: string;
        role: string;
        timestamp: string;
    };
}
export declare class OrderClosureAuditDto {
    userId: string;
    role: string;
    timestamp: string;
    orderId: string;
    tableNumber: number;
    finalAmount: number;
}
