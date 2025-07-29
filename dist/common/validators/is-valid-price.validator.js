"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidPriceConstraint = void 0;
exports.IsValidPrice = IsValidPrice;
const class_validator_1 = require("class-validator");
let IsValidPriceConstraint = class IsValidPriceConstraint {
    validate(price, args) {
        if (typeof price !== 'number')
            return false;
        if (price <= 0)
            return false;
        const decimalPlaces = (price.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2)
            return false;
        if (price > 9999.99)
            return false;
        return true;
    }
    defaultMessage(args) {
        return 'Preço deve ser um número positivo com no máximo 2 casas decimais e menor que R$ 9999,99';
    }
};
exports.IsValidPriceConstraint = IsValidPriceConstraint;
exports.IsValidPriceConstraint = IsValidPriceConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsValidPriceConstraint);
function IsValidPrice(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidPriceConstraint,
        });
    };
}
//# sourceMappingURL=is-valid-price.validator.js.map