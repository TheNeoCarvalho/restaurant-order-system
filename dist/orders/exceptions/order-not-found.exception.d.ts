import { NotFoundException } from '@nestjs/common';
export declare class OrderNotFoundException extends NotFoundException {
    constructor(orderId: string);
}
