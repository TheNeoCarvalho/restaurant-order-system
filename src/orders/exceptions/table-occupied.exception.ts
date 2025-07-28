import { BadRequestException } from '@nestjs/common';

export class TableOccupiedException extends BadRequestException {
  constructor(tableNumber: number) {
    super(`Mesa ${tableNumber} já está ocupada`);
  }
}