import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  @IsString({ message: 'Refresh token deve ser uma string' })
  @ApiProperty({
    description: 'Token de renovação JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  refreshToken: string;
}