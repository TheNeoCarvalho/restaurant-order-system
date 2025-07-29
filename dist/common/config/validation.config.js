"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationConfig = void 0;
exports.validationConfig = {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false,
    validationError: {
        target: false,
        value: false,
    },
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
        return {
            message: 'Dados de entrada inválidos',
            errors: messages,
            statusCode: 400,
        };
    },
};
//# sourceMappingURL=validation.config.js.map