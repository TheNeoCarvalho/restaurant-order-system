import { UserRole } from '../enums/user-role.enum';
export declare class User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    hashPassword(): Promise<void>;
    validatePassword(password: string): Promise<boolean>;
}
