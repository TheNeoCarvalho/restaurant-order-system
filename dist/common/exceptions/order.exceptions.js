"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemAlreadySentToKitchenException = exports.InvalidOrderStatusTransitionException = exports.OrderItemNotFoundException = exports.OrderHasPendingItemsException = exports.OrderAlreadyClosedException = exports.OrderNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class OrderNotFoundException extends common_1.NotFoundException {
    constructor(orderId) {
        super(`Pedido com ID ${orderId} não foi encontrado`);
    }
}
exports.OrderNotFoundException = OrderNotFoundException;
class OrderAlreadyClosedException extends common_1.BadRequestException {
    constructor(orderId) {
        super(`Pedido ${orderId} já foi fechado`);
    }
}
exports.OrderAlreadyClosedException = OrderAlreadyClosedException;
class OrderHasPendingItemsException extends common_1.BadRequestException {
    constructor(orderId) {
        super(`Pedido ${orderId} possui itens pendentes na cozinha`);
    }
}
exports.OrderHasPendingItemsException = OrderHasPendingItemsException;
class OrderItemNotFoundException extends common_1.NotFoundException {
    constructor(itemId) {
        super(`Item do pedido com ID ${itemId} não foi encontrado`);
    }
}
exports.OrderItemNotFoundException = OrderItemNotFoundException;
class InvalidOrderStatusTransitionException extends common_1.BadRequestException {
    constructor(currentStatus, newStatus) {
        super(`Transição de status inválida: de ${currentStatus} para ${newStatus}`);
    }
}
exports.InvalidOrderStatusTransitionException = InvalidOrderStatusTransitionException;
class OrderItemAlreadySentToKitchenException extends common_1.BadRequestException {
    constructor(itemId) {
        super(`Item ${itemId} já foi enviado para a cozinha e não pode ser modificado`);
    }
}
exports.OrderItemAlreadySentToKitchenException = OrderItemAlreadySentToKitchenException;
//# sourceMappingURL=order.exceptions.js.map