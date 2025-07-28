import { BadRequestException } from '@nestjs/common';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';
export declare class InvalidStatusTransitionException extends BadRequestException {
    constructor(currentStatus: OrderItemStatus, newStatus: OrderItemStatus);
}
