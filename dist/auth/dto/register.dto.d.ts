import { UserRole } from '../../users/enums/user-role.enum';
export declare class RegisterDto {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}
