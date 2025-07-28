"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedStatusUpdateException = void 0;
const common_1 = require("@nestjs/common");
class UnauthorizedStatusUpdateException extends common_1.ForbiddenException {
    constructor(userRole, status) {
        super(`Usuário com role ${userRole} não pode alterar status para ${status}`);
    }
}
exports.UnauthorizedStatusUpdateException = UnauthorizedStatusUpdateException;
//# sourceMappingURL=unauthorized-status-update.exception.js.map