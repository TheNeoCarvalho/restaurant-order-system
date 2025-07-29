"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const validation_config_1 = require("../config/validation.config");
let CustomValidationPipe = class CustomValidationPipe extends common_1.ValidationPipe {
    constructor() {
        super({
            ...validation_config_1.validationConfig,
            exceptionFactory: (errors) => {
                const messages = errors.map((error) => {
                    const constraints = error.constraints;
                    if (constraints) {
                        return {
                            property: error.property,
                            messages: Object.values(constraints),
                        };
                    }
                    return {
                        property: error.property,
                        messages: ['Validation failed'],
                    };
                });
                return new common_1.BadRequestException({
                    message: 'Dados de entrada inválidos',
                    errors: messages,
                    statusCode: 400,
                });
            },
        });
    }
};
exports.CustomValidationPipe = CustomValidationPipe;
exports.CustomValidationPipe = CustomValidationPipe = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CustomValidationPipe);
//# sourceMappingURL=validation.pipe.js.map