import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrderItemStatus } from '../../common/enums/order-item-status.enum';
export declare class UnauthorizedStatusUpdateException extends ForbiddenException {
    constructor(userRole: UserRole, status: OrderItemStatus);
}
