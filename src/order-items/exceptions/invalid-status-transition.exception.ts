import { BadRequestException } from '@nestjs/common';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';

export class InvalidStatusTransitionException extends BadRequestException {
  constructor(currentStatus: OrderItemStatus, newStatus: OrderItemStatus) {
    super(`Não é possível alterar status de ${currentStatus} para ${newStatus}`);
  }
}