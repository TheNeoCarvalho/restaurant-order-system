import { BadRequestException } from '@nestjs/common';
export declare class TableOccupiedException extends BadRequestException {
    constructor(tableNumber: number);
}
