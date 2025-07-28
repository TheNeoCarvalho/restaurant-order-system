"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemNotAvailableException = void 0;
const common_1 = require("@nestjs/common");
class MenuItemNotAvailableException extends common_1.BadRequestException {
    constructor(itemName) {
        super(`Item ${itemName} não está disponível`);
    }
}
exports.MenuItemNotAvailableException = MenuItemNotAvailableException;
//# sourceMappingURL=menu-item-not-available.exception.js.map