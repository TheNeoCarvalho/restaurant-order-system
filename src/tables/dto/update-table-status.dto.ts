import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TableStatus } from '../../common/enums/table-status.enum';

export class UpdateTableStatusDto {
  @ApiProperty({
    description: 'Novo status da mesa',
    enum: TableStatus,
    example: TableStatus.OCCUPIED,
  })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  @IsEnum(TableStatus, { message: 'Status deve ser um valor válido' })
  status: TableStatus;
}