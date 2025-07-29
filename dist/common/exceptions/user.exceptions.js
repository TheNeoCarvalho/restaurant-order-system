"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInactiveException = exports.UserAlreadyExistsException = exports.UserNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class UserNotFoundException extends common_1.NotFoundException {
    constructor(userId) {
        super(`Usuário com ID ${userId} não foi encontrado`);
    }
}
exports.UserNotFoundException = UserNotFoundException;
class UserAlreadyExistsException extends common_1.BadRequestException {
    constructor(email) {
        super(`Usuário com email ${email} já existe`);
    }
}
exports.UserAlreadyExistsException = UserAlreadyExistsException;
class UserInactiveException extends common_1.BadRequestException {
    constructor(userId) {
        super(`Usuário ${userId} está inativo`);
    }
}
exports.UserInactiveException = UserInactiveException;
//# sourceMappingURL=user.exceptions.js.map