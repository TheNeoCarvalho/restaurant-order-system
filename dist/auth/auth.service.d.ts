import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto, JwtPayload, TokenPair } from './dto/auth-response.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService);
    validateUser(email: string, password: string): Promise<User | null>;
    login(user: User): Promise<AuthResponseDto>;
    generateTokens(payload: JwtPayload): Promise<TokenPair>;
    refreshTokens(refreshToken: string): Promise<AuthResponseDto>;
}
