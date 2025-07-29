import { BadRequestException, NotFoundException } from '@nestjs/common';

export class TableOccupiedException extends BadRequestException {
  constructor(tableNumber: number) {
    super(`Mesa ${tableNumber} já está ocupada`);
  }
}

export class TableNotFoundException extends NotFoundException {
  constructor(tableId: number) {
    super(`Mesa com ID ${tableId} não foi encontrada`);
  }
}

export class TableNotAvailableException extends BadRequestException {
  constructor(tableNumber: number) {
    super(`Mesa ${tableNumber} não está disponível`);
  }
}