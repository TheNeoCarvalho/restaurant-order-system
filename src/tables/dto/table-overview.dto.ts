import { ApiProperty } from '@nestjs/swagger';
import { TableStatus } from '../../common/enums/table-status.enum';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';

export class PendingOrderItemDto {
  @ApiProperty({ description: 'ID do item do pedido' })
  id: string;

  @ApiProperty({ description: 'Nome do item do menu' })
  menuItemName: string;

  @ApiProperty({ description: 'Quantidade' })
  quantity: number;

  @ApiProperty({ description: 'Status do item', enum: OrderItemStatus })
  status: OrderItemStatus;

  @ApiProperty({ description: 'Instruções especiais', required: false })
  specialInstructions?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Tempo estimado de preparo em minutos', required: false })
  estimatedPreparationTime?: number;
}

export class TableOverviewDto {
  @ApiProperty({ description: 'ID da mesa' })
  id: number;

  @ApiProperty({ description: 'Número da mesa' })
  number: number;

  @ApiProperty({ description: 'Capacidade da mesa' })
  capacity: number;

  @ApiProperty({ description: 'Status da mesa', enum: TableStatus })
  status: TableStatus;

  @ApiProperty({ description: 'ID da comanda ativa', required: false })
  activeOrderId?: string;

  @ApiProperty({ description: 'Nome do garçom responsável', required: false })
  waiterName?: string;

  @ApiProperty({ description: 'Valor total da comanda ativa', required: false })
  orderTotal?: number;

  @ApiProperty({ description: 'Número total de itens na comanda', required: false })
  totalItems?: number;

  @ApiProperty({ description: 'Número de itens pendentes', required: false })
  pendingItems?: number;

  @ApiProperty({ description: 'Número de itens em preparo', required: false })
  itemsInPreparation?: number;

  @ApiProperty({ description: 'Número de itens prontos', required: false })
  readyItems?: number;

  @ApiProperty({ description: 'Lista de itens pendentes', type: [PendingOrderItemDto], required: false })
  pendingOrderItems?: PendingOrderItemDto[];

  @ApiProperty({ description: 'Data de abertura da comanda', required: false })
  orderOpenedAt?: Date;

  @ApiProperty({ description: 'Tempo desde abertura da comanda em minutos', required: false })
  orderDurationMinutes?: number;

  @ApiProperty({ description: 'Indica se a mesa tem pedidos pendentes' })
  hasPendingOrders: boolean;

  @ApiProperty({ description: 'Prioridade da mesa baseada no tempo de espera', enum: ['low', 'medium', 'high'] })
  priority: 'low' | 'medium' | 'high';
}

export class TablesOverviewQueryDto {
  @ApiProperty({ description: 'Filtrar por status da mesa', enum: TableStatus, required: false })
  status?: TableStatus;

  @ApiProperty({ description: 'Filtrar apenas mesas com pedidos pendentes', required: false })
  hasPendingOrders?: boolean;

  @ApiProperty({ description: 'Ordenar por campo', enum: ['number', 'status', 'orderDuration', 'pendingItems'], required: false })
  sortBy?: 'number' | 'status' | 'orderDuration' | 'pendingItems';

  @ApiProperty({ description: 'Direção da ordenação', enum: ['ASC', 'DESC'], required: false })
  sortOrder?: 'ASC' | 'DESC';

  @ApiProperty({ description: 'Incluir detalhes dos itens pendentes', required: false })
  includeOrderDetails?: boolean;
}