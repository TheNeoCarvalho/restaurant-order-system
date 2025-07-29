"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderClosureAuditDto = exports.CloseOrderResponseDto = void 0;
class CloseOrderResponseDto {
    message;
    order;
    summary;
    closedBy;
}
exports.CloseOrderResponseDto = CloseOrderResponseDto;
class OrderClosureAuditDto {
    userId;
    role;
    timestamp;
    orderId;
    tableNumber;
    finalAmount;
}
exports.OrderClosureAuditDto = OrderClosureAuditDto;
//# sourceMappingURL=close-order-response.dto.js.map