import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

export class OrderNotFoundException extends NotFoundException {
  constructor(orderId: string) {
    super(`Pedido com ID ${orderId} não foi encontrado`);
  }
}

export class OrderAlreadyClosedException extends BadRequestException {
  constructor(orderId: string) {
    super(`Pedido ${orderId} já foi fechado`);
  }
}

export class OrderHasPendingItemsException extends BadRequestException {
  constructor(orderId: string) {
    super(`Pedido ${orderId} possui itens pendentes na cozinha`);
  }
}

export class OrderItemNotFoundException extends NotFoundException {
  constructor(itemId: string) {
    super(`Item do pedido com ID ${itemId} não foi encontrado`);
  }
}

export class InvalidOrderStatusTransitionException extends BadRequestException {
  constructor(currentStatus: string, newStatus: string) {
    super(`Transição de status inválida: de ${currentStatus} para ${newStatus}`);
  }
}

export class OrderItemAlreadySentToKitchenException extends BadRequestException {
  constructor(itemId: string) {
    super(`Item ${itemId} já foi enviado para a cozinha e não pode ser modificado`);
  }
}