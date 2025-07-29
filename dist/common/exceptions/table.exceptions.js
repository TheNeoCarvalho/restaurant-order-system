"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableNotAvailableException = exports.TableNotFoundException = exports.TableOccupiedException = void 0;
const common_1 = require("@nestjs/common");
class TableOccupiedException extends common_1.BadRequestException {
    constructor(tableNumber) {
        super(`Mesa ${tableNumber} já está ocupada`);
    }
}
exports.TableOccupiedException = TableOccupiedException;
class TableNotFoundException extends common_1.NotFoundException {
    constructor(tableId) {
        super(`Mesa com ID ${tableId} não foi encontrada`);
    }
}
exports.TableNotFoundException = TableNotFoundException;
class TableNotAvailableException extends common_1.BadRequestException {
    constructor(tableNumber) {
        super(`Mesa ${tableNumber} não está disponível`);
    }
}
exports.TableNotAvailableException = TableNotAvailableException;
//# sourceMappingURL=table.exceptions.js.map