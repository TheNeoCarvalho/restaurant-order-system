"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidTableNumberConstraint = void 0;
exports.IsValidTableNumber = IsValidTableNumber;
const class_validator_1 = require("class-validator");
let IsValidTableNumberConstraint = class IsValidTableNumberConstraint {
    validate(tableNumber, args) {
        return typeof tableNumber === 'number' && tableNumber > 0 && tableNumber <= 100;
    }
    defaultMessage(args) {
        return 'Número da mesa deve ser um número entre 1 e 100';
    }
};
exports.IsValidTableNumberConstraint = IsValidTableNumberConstraint;
exports.IsValidTableNumberConstraint = IsValidTableNumberConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsValidTableNumberConstraint);
function IsValidTableNumber(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidTableNumberConstraint,
        });
    };
}
//# sourceMappingURL=is-valid-table-number.validator.js.map