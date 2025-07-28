"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableOccupiedException = void 0;
const common_1 = require("@nestjs/common");
class TableOccupiedException extends common_1.BadRequestException {
    constructor(tableNumber) {
        super(`Mesa ${tableNumber} já está ocupada`);
    }
}
exports.TableOccupiedException = TableOccupiedException;
//# sourceMappingURL=table-occupied.exception.js.map