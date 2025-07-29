"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidPriceException = exports.MenuItemNotAvailableException = exports.MenuItemNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class MenuItemNotFoundException extends common_1.NotFoundException {
    constructor(itemId) {
        super(`Item do cardápio com ID ${itemId} não foi encontrado`);
    }
}
exports.MenuItemNotFoundException = MenuItemNotFoundException;
class MenuItemNotAvailableException extends common_1.BadRequestException {
    constructor(itemName) {
        super(`Item ${itemName} não está disponível`);
    }
}
exports.MenuItemNotAvailableException = MenuItemNotAvailableException;
class InvalidPriceException extends common_1.BadRequestException {
    constructor(price) {
        super(`Preço inválido: ${price}. O preço deve ser maior que zero`);
    }
}
exports.InvalidPriceException = InvalidPriceException;
//# sourceMappingURL=menu.exceptions.js.map