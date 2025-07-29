import { BadRequestException, NotFoundException } from '@nestjs/common';
export declare class MenuItemNotFoundException extends NotFoundException {
    constructor(itemId: string);
}
export declare class MenuItemNotAvailableException extends BadRequestException {
    constructor(itemName: string);
}
export declare class InvalidPriceException extends BadRequestException {
    constructor(price: number);
}
