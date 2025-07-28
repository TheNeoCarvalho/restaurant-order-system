import { UserRole } from '../enums/user-role.enum';
export declare class CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}
