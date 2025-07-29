"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLockedException = exports.InsufficientPermissionsException = exports.InvalidTokenException = exports.TokenExpiredException = exports.InvalidCredentialsException = void 0;
const common_1 = require("@nestjs/common");
class InvalidCredentialsException extends common_1.UnauthorizedException {
    constructor() {
        super('Credenciais inválidas');
    }
}
exports.InvalidCredentialsException = InvalidCredentialsException;
class TokenExpiredException extends common_1.UnauthorizedException {
    constructor() {
        super('Token expirado');
    }
}
exports.TokenExpiredException = TokenExpiredException;
class InvalidTokenException extends common_1.UnauthorizedException {
    constructor() {
        super('Token inválido');
    }
}
exports.InvalidTokenException = InvalidTokenException;
class InsufficientPermissionsException extends common_1.ForbiddenException {
    constructor(requiredRole) {
        super(`Permissão insuficiente. Requer role: ${requiredRole}`);
    }
}
exports.InsufficientPermissionsException = InsufficientPermissionsException;
class AccountLockedException extends common_1.BadRequestException {
    constructor() {
        super('Conta bloqueada devido a múltiplas tentativas de login falharam');
    }
}
exports.AccountLockedException = AccountLockedException;
//# sourceMappingURL=auth.exceptions.js.map