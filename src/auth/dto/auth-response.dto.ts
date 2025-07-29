import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de renovação',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Informações do usuário',
    example: {
      id: 'uuid-string',
      email: 'user@example.com',
      name: 'Nome do Usuário',
      role: 'admin'
    }
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export class TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}