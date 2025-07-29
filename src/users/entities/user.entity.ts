import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @ApiProperty({
    description: 'ID único do usuário',
    example: 'uuid-string',
    format: 'uuid'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Email do usuário (único)',
    example: 'user@example.com'
  })
  @Column({ unique: true })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (hash)',
    writeOnly: true
  })
  @Column()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva'
  })
  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({
    description: 'Tipo de usuário no sistema',
    enum: UserRole,
    example: UserRole.WAITER
  })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.WAITER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Status de ativação do usuário',
    example: true
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Data de criação do usuário',
    example: '2024-01-01T12:00:00.000Z'
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-01T12:00:00.000Z'
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}