import { IsEnum, IsUUID } from 'class-validator';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';

export class UpdateOrderItemStatusDto {
  @IsEnum(OrderItemStatus, { 
    message: 'Status deve ser um valor válido: pending, in_preparation, ready, delivered, cancelled' 
  })
  status: OrderItemStatus;

  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  updatedBy: string;
}