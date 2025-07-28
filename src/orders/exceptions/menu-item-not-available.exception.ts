import { BadRequestException } from '@nestjs/common';

export class MenuItemNotAvailableException extends BadRequestException {
  constructor(itemName: string) {
    super(`Item ${itemName} não está disponível`);
  }
}