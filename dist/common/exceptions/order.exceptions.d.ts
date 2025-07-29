import { BadRequestException, NotFoundException } from '@nestjs/common';
export declare class OrderNotFoundException extends NotFoundException {
    constructor(orderId: string);
}
export declare class OrderAlreadyClosedException extends BadRequestException {
    constructor(orderId: string);
}
export declare class OrderHasPendingItemsException extends BadRequestException {
    constructor(orderId: string);
}
export declare class OrderItemNotFoundException extends NotFoundException {
    constructor(itemId: string);
}
export declare class InvalidOrderStatusTransitionException extends BadRequestException {
    constructor(currentStatus: string, newStatus: string);
}
export declare class OrderItemAlreadySentToKitchenException extends BadRequestException {
    constructor(itemId: string);
}
