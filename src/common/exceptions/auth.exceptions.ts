import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Credenciais inválidas');
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Token expirado');
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super('Token inválido');
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(requiredRole: string) {
    super(`Permissão insuficiente. Requer role: ${requiredRole}`);
  }
}

export class AccountLockedException extends BadRequestException {
  constructor() {
    super('Conta bloqueada devido a múltiplas tentativas de login falharam');
  }
}