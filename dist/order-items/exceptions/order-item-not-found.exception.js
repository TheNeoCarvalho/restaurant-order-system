"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class OrderItemNotFoundException extends common_1.NotFoundException {
    constructor(itemId) {
        super(`Item do pedido com ID ${itemId} não encontrado`);
    }
}
exports.OrderItemNotFoundException = OrderItemNotFoundException;
//# sourceMappingURL=order-item-not-found.exception.js.map