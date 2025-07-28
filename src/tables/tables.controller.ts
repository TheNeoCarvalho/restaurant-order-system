import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@Controller('tables')
export class TablesController {
  
  // Todos os usuários autenticados podem visualizar as mesas
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentUser() user: User) {
    return {
      message: 'Lista de todas as mesas',
      requestedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      tables: [
        { id: 1, number: 1, capacity: 4, status: 'available' },
        { id: 2, number: 2, capacity: 2, status: 'occupied' },
        { id: 3, number: 3, capacity: 6, status: 'reserved' },
      ],
    };
  }

  // Apenas administradores e garçons podem criar novas mesas
  @Post()
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTableDto: any, @CurrentUser() user: User) {
    return {
      message: 'Mesa criada com sucesso',
      createdBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      table: {
        id: 4,
        ...createTableDto,
        status: 'available',
      },
    };
  }

  // Todos os usuários autenticados podem visualizar uma mesa específica
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return {
      message: `Detalhes da mesa ${id}`,
      requestedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      table: {
        id: parseInt(id),
        number: parseInt(id),
        capacity: 4,
        status: 'available',
      },
    };
  }

  // Apenas administradores podem atualizar configurações das mesas
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string, 
    @Body() updateTableDto: any, 
    @CurrentUser() user: User
  ) {
    return {
      message: `Mesa ${id} atualizada com sucesso`,
      updatedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      table: {
        id: parseInt(id),
        ...updateTableDto,
      },
    };
  }

  // Apenas administradores podem deletar mesas
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return {
      message: `Mesa ${id} removida com sucesso`,
      deletedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }

  // Garçons e administradores podem alterar status da mesa
  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: { status: string },
    @CurrentUser() user: User
  ) {
    return {
      message: `Status da mesa ${id} atualizado para ${statusDto.status}`,
      updatedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      table: {
        id: parseInt(id),
        status: statusDto.status,
      },
    };
  }

  // Endpoint específico para a cozinha visualizar mesas com pedidos
  @Get('kitchen/with-orders')
  @Roles(UserRole.KITCHEN)
  @HttpCode(HttpStatus.OK)
  async getTablesWithOrders(@CurrentUser() user: User) {
    return {
      message: 'Mesas com pedidos pendentes para a cozinha',
      requestedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      tables: [
        { 
          id: 2, 
          number: 2, 
          status: 'occupied',
          pendingOrders: [
            { id: 1, item: 'Hambúrguer', status: 'pending' },
            { id: 2, item: 'Batata Frita', status: 'in_preparation' },
          ]
        },
      ],
    };
  }
}