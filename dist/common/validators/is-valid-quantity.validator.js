"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidQuantityConstraint = void 0;
exports.IsValidQuantity = IsValidQuantity;
const class_validator_1 = require("class-validator");
let IsValidQuantityConstraint = class IsValidQuantityConstraint {
    validate(quantity, args) {
        if (typeof quantity !== 'number')
            return false;
        if (!Number.isInteger(quantity) || quantity <= 0)
            return false;
        if (quantity > 50)
            return false;
        return true;
    }
    defaultMessage(args) {
        return 'Quantidade deve ser um número inteiro positivo e menor que 50';
    }
};
exports.IsValidQuantityConstraint = IsValidQuantityConstraint;
exports.IsValidQuantityConstraint = IsValidQuantityConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsValidQuantityConstraint);
function IsValidQuantity(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidQuantityConstraint,
        });
    };
}
//# sourceMappingURL=is-valid-quantity.validator.js.map