import { NotFoundException } from '@nestjs/common';

export class OrderItemNotFoundException extends NotFoundException {
  constructor(itemId: string) {
    super(`Item do pedido com ID ${itemId} não encontrado`);
  }
}