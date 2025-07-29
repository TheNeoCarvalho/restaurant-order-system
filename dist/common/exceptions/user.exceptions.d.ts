import { BadRequestException, NotFoundException } from '@nestjs/common';
export declare class UserNotFoundException extends NotFoundException {
    constructor(userId: string);
}
export declare class UserAlreadyExistsException extends BadRequestException {
    constructor(email: string);
}
export declare class UserInactiveException extends BadRequestException {
    constructor(userId: string);
}
