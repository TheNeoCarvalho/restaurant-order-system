"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class OrderNotFoundException extends common_1.NotFoundException {
    constructor(orderId) {
        super(`Pedido com ID ${orderId} não encontrado`);
    }
}
exports.OrderNotFoundException = OrderNotFoundException;
//# sourceMappingURL=order-not-found.exception.js.map