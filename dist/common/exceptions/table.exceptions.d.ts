import { BadRequestException, NotFoundException } from '@nestjs/common';
export declare class TableOccupiedException extends BadRequestException {
    constructor(tableNumber: number);
}
export declare class TableNotFoundException extends NotFoundException {
    constructor(tableId: number);
}
export declare class TableNotAvailableException extends BadRequestException {
    constructor(tableNumber: number);
}
