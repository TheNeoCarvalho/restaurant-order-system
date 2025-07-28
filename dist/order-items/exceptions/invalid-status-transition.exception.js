"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidStatusTransitionException = void 0;
const common_1 = require("@nestjs/common");
class InvalidStatusTransitionException extends common_1.BadRequestException {
    constructor(currentStatus, newStatus) {
        super(`Não é possível alterar status de ${currentStatus} para ${newStatus}`);
    }
}
exports.InvalidStatusTransitionException = InvalidStatusTransitionException;
//# sourceMappingURL=invalid-status-transition.exception.js.map