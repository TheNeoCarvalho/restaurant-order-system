"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsTableAvailableConstraint = void 0;
exports.IsTableAvailable = IsTableAvailable;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
let IsTableAvailableConstraint = class IsTableAvailableConstraint {
    async validate(tableId, args) {
        return typeof tableId === 'number' && tableId > 0;
    }
    defaultMessage(args) {
        return 'Mesa não está disponível ou não existe';
    }
};
exports.IsTableAvailableConstraint = IsTableAvailableConstraint;
exports.IsTableAvailableConstraint = IsTableAvailableConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isTableAvailable', async: true }),
    (0, common_1.Injectable)()
], IsTableAvailableConstraint);
function IsTableAvailable(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTableAvailableConstraint,
        });
    };
}
//# sourceMappingURL=is-table-available.validator.js.map