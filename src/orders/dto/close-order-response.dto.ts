import { ApiProperty } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { OrderSummary } from '../interfaces';

/**
 * DTO para resposta do fechamento de comanda
 */
export class CloseOrderResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação do fechamento',
    example: 'Comanda fechada com sucesso'
  })
  message: string;

  @ApiProperty({
    description: 'Dados da comanda fechada',
    type: Order
  })
  order: Order;

  @ApiProperty({
    description: 'Resumo detalhado da comanda com totais e impostos'
  })
  summary: OrderSummary;

  @ApiProperty({
    description: 'Informações de quem fechou a comanda',
    example: {
      userId: 'uuid-string',
      role: 'waiter',
      timestamp: '2024-01-01T12:00:00.000Z'
    }
  })
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