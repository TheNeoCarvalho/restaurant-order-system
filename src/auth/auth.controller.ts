import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Fazer login no sistema',
    description: 'Autentica um usuário com email e senha, retornando tokens JWT'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
    schema: {
      example: {
        statusCode: 401,
        message: 'Credenciais inválidas',
        error: 'Unauthorized'
      }
    }
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.authService.login(user);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Registrar novo usuário',
    description: 'Cria uma nova conta de usuário no sistema'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuário registrado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou email já existe',
    schema: {
      example: {
        statusCode: 400,
        message: ['Email deve ter um formato válido', 'Senha deve ter pelo menos 6 caracteres'],
        error: 'Bad Request'
      }
    }
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Fazer logout',
    description: 'Invalida o token de refresh do usuário atual'
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    schema: {
      example: {
        message: 'Logout realizado com sucesso'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado'
  })
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Logout realizado com sucesso' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Renovar tokens',
    description: 'Gera novos tokens JWT usando o refresh token'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado'
  })
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obter perfil do usuário',
    description: 'Retorna informações do usuário autenticado'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário',
    schema: {
      example: {
        id: 'uuid-string',
        email: 'user@example.com',
        name: 'Nome do Usuário',
        role: 'admin',
        isActive: true
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado'
  })
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  }

  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Endpoint exclusivo para administradores',
    description: 'Endpoint de teste para verificar autorização de administradores'
  })
  @ApiResponse({
    status: 200,
    description: 'Acesso autorizado para administrador',
    schema: {
      example: {
        message: 'Este endpoint é acessível apenas por administradores',
        user: {
          id: 'uuid-string',
          name: 'Admin User',
          role: 'admin'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  async adminOnlyEndpoint(@CurrentUser() user: User) {
    return {
      message: 'Este endpoint é acessível apenas por administradores',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Get('waiter-kitchen')
  @Roles(UserRole.WAITER, UserRole.KITCHEN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Endpoint para garçons e cozinha',
    description: 'Endpoint de teste para verificar autorização de garçons e funcionários da cozinha'
  })
  @ApiResponse({
    status: 200,
    description: 'Acesso autorizado para garçons e cozinha',
    schema: {
      example: {
        message: 'Este endpoint é acessível por garçons e cozinha',
        user: {
          id: 'uuid-string',
          name: 'Waiter User',
          role: 'waiter'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas garçons e cozinha'
  })
  async waiterKitchenEndpoint(@CurrentUser() user: User) {
    return {
      message: 'Este endpoint é acessível por garçons e cozinha',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }
}