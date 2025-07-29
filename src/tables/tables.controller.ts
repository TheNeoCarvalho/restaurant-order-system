import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto, TableOverviewDto, TablesOverviewQueryDto } from './dto';
import { Table } from './entities/table.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('tables')
@ApiBearerAuth()
@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova mesa (apenas Admin)' })
  @ApiResponse({ status: 201, description: 'Mesa criada com sucesso', type: Table })
  @ApiResponse({ status: 409, description: 'Mesa com esse número já existe' })
  async create(
    @Body() createTableDto: CreateTableDto,
    @CurrentUser() user: User,
  ): Promise<Table> {
    return await this.tablesService.create(createTableDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas as mesas' })
  @ApiResponse({ status: 200, description: 'Lista de mesas', type: [Table] })
  async findAll(@CurrentUser() user: User): Promise<Table[]> {
    return await this.tablesService.findAll();
  }

  @Get('available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar mesas disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de mesas disponíveis', type: [Table] })
  async findAvailable(@CurrentUser() user: User): Promise<Table[]> {
    return await this.tablesService.findAvailable();
  }

  @Get('occupied')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar mesas ocupadas' })
  @ApiResponse({ status: 200, description: 'Lista de mesas ocupadas', type: [Table] })
  async findOccupied(@CurrentUser() user: User): Promise<Table[]> {
    return await this.tablesService.findOccupied();
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resumo do status das mesas' })
  @ApiResponse({ status: 200, description: 'Resumo das mesas por status' })
  async getTablesSummary(@CurrentUser() user: User) {
    return await this.tablesService.getTablesSummary();
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Visão geral de todas as mesas com informações de pedidos' })
  @ApiResponse({ status: 200, description: 'Lista detalhada de mesas com status de pedidos', type: [TableOverviewDto] })
  @ApiQuery({ name: 'status', enum: ['available', 'occupied', 'reserved', 'cleaning'], required: false })
  @ApiQuery({ name: 'hasPendingOrders', type: Boolean, required: false })
  @ApiQuery({ name: 'sortBy', enum: ['number', 'status', 'orderDuration', 'pendingItems'], required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  @ApiQuery({ name: 'includeOrderDetails', type: Boolean, required: false })
  async getTablesOverview(
    @Query() query: TablesOverviewQueryDto,
    @CurrentUser() user: User,
  ): Promise<TableOverviewDto[]> {
    return await this.tablesService.getTablesOverview(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar mesa por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes da mesa', type: Table })
  @ApiResponse({ status: 404, description: 'Mesa não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<Table> {
    return await this.tablesService.findOne(id);
  }

  @Get(':id/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar disponibilidade da mesa' })
  @ApiResponse({ status: 200, description: 'Status de disponibilidade' })
  async checkAvailability(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<{ available: boolean }> {
    const available = await this.tablesService.checkAvailability(id);
    return { available };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar mesa (apenas Admin)' })
  @ApiResponse({ status: 200, description: 'Mesa atualizada com sucesso', type: Table })
  @ApiResponse({ status: 404, description: 'Mesa não encontrada' })
  @ApiResponse({ status: 409, description: 'Mesa com esse número já existe' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTableDto: UpdateTableDto,
    @CurrentUser() user: User,
  ): Promise<Table> {
    return await this.tablesService.update(id, updateTableDto);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status da mesa (Admin e Garçom)' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso', type: Table })
  @ApiResponse({ status: 404, description: 'Mesa não encontrada' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTableStatusDto,
    @CurrentUser() user: User,
  ): Promise<Table> {
    return await this.tablesService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover mesa (apenas Admin)' })
  @ApiResponse({ status: 204, description: 'Mesa removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Mesa não encontrada' })
  @ApiResponse({ status: 409, description: 'Não é possível remover mesa ocupada' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.tablesService.remove(id);
  }
}