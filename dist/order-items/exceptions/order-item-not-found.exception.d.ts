import { NotFoundException } from '@nestjs/common';
export declare class OrderItemNotFoundException extends NotFoundException {
    constructor(itemId: string);
}
