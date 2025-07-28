import { BadRequestException } from '@nestjs/common';
export declare class MenuItemNotAvailableException extends BadRequestException {
    constructor(itemName: string);
}
