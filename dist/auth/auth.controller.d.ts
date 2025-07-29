import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    logout(user: User): Promise<{
        message: string;
    }>;
    refresh(refreshDto: RefreshTokenDto): Promise<AuthResponseDto>;
    getProfile(user: User): Promise<{
        id: string;
        email: string;
        name: string;
        role: UserRole;
        isActive: boolean;
    }>;
    adminOnlyEndpoint(user: User): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            role: UserRole;
        };
    }>;
    waiterKitchenEndpoint(user: User): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            role: UserRole;
        };
    }>;
}
