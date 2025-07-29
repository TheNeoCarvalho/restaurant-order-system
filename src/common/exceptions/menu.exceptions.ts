import { BadRequestException, NotFoundException } from '@nestjs/common';

export class MenuItemNotFoundException extends NotFoundException {
  constructor(itemId: string) {
    super(`Item do cardápio com ID ${itemId} não foi encontrado`);
  }
}

export class MenuItemNotAvailableException extends BadRequestException {
  constructor(itemName: string) {
    super(`Item ${itemName} não está disponível`);
  }
}

export class InvalidPriceException extends BadRequestException {
  constructor(price: number) {
    super(`Preço inválido: ${price}. O preço deve ser maior que zero`);
  }
}