import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';

export class RegisterDto {
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @ApiProperty({ example: 'usuario@email.com' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  @ApiProperty({ example: '123456' })
  password: string;

  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({ example: 'João Silva' })
  name: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser admin, waiter ou kitchen' })
  @ApiProperty({ enum: UserRole, required: false, default: UserRole.WAITER })
  role?: UserRole;
}