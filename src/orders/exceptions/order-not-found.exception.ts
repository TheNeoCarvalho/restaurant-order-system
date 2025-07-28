import { NotFoundException } from '@nestjs/common';

export class OrderNotFoundException extends NotFoundException {
  constructor(orderId: string) {
    super(`Pedido com ID ${orderId} não encontrado`);
  }
}