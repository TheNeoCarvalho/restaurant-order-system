import { BadRequestException, NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`Usuário com ID ${userId} não foi encontrado`);
  }
}

export class UserAlreadyExistsException extends BadRequestException {
  constructor(email: string) {
    super(`Usuário com email ${email} já existe`);
  }
}

export class UserInactiveException extends BadRequestException {
  constructor(userId: string) {
    super(`Usuário ${userId} está inativo`);
  }
}