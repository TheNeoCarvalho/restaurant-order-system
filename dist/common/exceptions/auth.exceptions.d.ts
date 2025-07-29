import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
export declare class InvalidCredentialsException extends UnauthorizedException {
    constructor();
}
export declare class TokenExpiredException extends UnauthorizedException {
    constructor();
}
export declare class InvalidTokenException extends UnauthorizedException {
    constructor();
}
export declare class InsufficientPermissionsException extends ForbiddenException {
    constructor(requiredRole: string);
}
export declare class AccountLockedException extends BadRequestException {
    constructor();
}
