import { Order } from '../entities/order.entity';
import { OrderSummary } from '../interfaces';

/**
 * DTO para resposta do fechamento de comanda
 */
export class CloseOrderResponseDto {
  message: string;
  order: Order;
  summary: OrderSummary;
  closedBy: {
    userId: string;
    role: string;
    timestamp: string;
  };
}

/**
 * DTO para informações de auditoria do fechamento
 */
export class OrderClosureAuditDto {
  userId: string;
  role: string;
  timestamp: string;
  orderId: string;
  tableNumber: number;
  finalAmount: number;
}