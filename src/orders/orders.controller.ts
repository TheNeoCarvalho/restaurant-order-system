import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderItemsService } from '../order-items/order-items.service';
import { CreateOrderDto, AddItemToOrderDto, UpdateOrderDto, CloseOrderResponseDto } from './dto';
import { UpdateOrderItemStatusDto } from '../order-items/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderItemsService: OrderItemsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ 
    summary: 'Criar nova comanda',
    description: 'Cria uma nova comanda para uma mesa. Apenas garçons e admins podem criar comandas.'
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Comanda criada com sucesso'
  })
  @ApiResponse({
    status: 400,
    description: 'Mesa já possui comanda ativa ou dados inválidos'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas garçons e admins'
  })
  @ApiResponse({
    status: 404,
    description: 'Mesa não encontrada'
  })
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Listar todas as comandas',
    description: 'Retorna lista de todas as comandas do sistema. Apenas admins têm acesso.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comandas retornada com sucesso'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Buscar comanda por ID',
    description: 'Retorna detalhes de uma comanda específica'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da comanda',
    type: String,
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Comanda encontrada'
  })
  @ApiResponse({
    status: 404,
    description: 'Comanda não encontrada'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * Buscar comandas por mesa
   */
  @Get('table/:tableId')
  @Roles(UserRole.ADMIN)
  async findByTable(@Param('tableId', ParseIntPipe) tableId: number) {
    return this.ordersService.findByTable(tableId);
  }

  /**
   * Buscar comanda ativa de uma mesa
   */
  @Get('table/:tableId/active')
  @Roles(UserRole.ADMIN)
  async findActiveOrderByTable(@Param('tableId', ParseIntPipe) tableId: number) {
    return this.ordersService.findActiveOrderByTable(tableId);
  }

  /**
   * Atualizar comanda
   * Apenas garçons e admins podem atualizar comandas
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @ApiOperation({ 
    summary: 'Adicionar item à comanda',
    description: 'Adiciona um novo item do cardápio à comanda. Apenas garçons e admins podem adicionar itens.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da comanda',
    type: String,
    format: 'uuid'
  })
  @ApiBody({ type: AddItemToOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Item adicionado com sucesso'
  })
  @ApiResponse({
    status: 400,
    description: 'Item não disponível ou dados inválidos'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas garçons e admins'
  })
  @ApiResponse({
    status: 404,
    description: 'Comanda ou item do cardápio não encontrado'
  })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addItemDto: AddItemToOrderDto,
  ) {
    return this.ordersService.addItemToOrder(id, addItemDto);
  }

  /**
   * Remover item da comanda
   * Apenas garçons e admins podem remover itens
   */
  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.ordersService.removeItemFromOrder(id, itemId);
  }

  /**
   * Atualizar quantidade de um item
   * Apenas garçons e admins podem atualizar quantidades
   */
  @Patch(':id/items/:itemId/quantity')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  async updateItemQuantity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.ordersService.updateItemQuantity(id, itemId, quantity);
  }

  @Post(':id/close')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Fechar comanda',
    description: 'Fecha uma comanda, calcula o total com impostos e gera resumo detalhado. Apenas garçons e admins podem fechar comandas.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da comanda',
    type: String,
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Comanda fechada com sucesso',
    type: CloseOrderResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Comanda já está fechada ou possui itens pendentes'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas garçons e admins'
  })
  @ApiResponse({
    status: 404,
    description: 'Comanda não encontrada'
  })
  async closeOrder(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<CloseOrderResponseDto> {
    const logger = new Logger('OrdersController');
    
    // Validação adicional de segurança - verificar se o usuário tem permissão
    const userRole = req.user.role;
    const userId = req.user.sub;
    
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.WAITER) {
      logger.warn(`Tentativa de fechamento de comanda por usuário não autorizado: ${userId} (${userRole})`);
      throw new ForbiddenException('Usuário não tem permissão para fechar comandas');
    }

    try {
      // Executar o fechamento da comanda
      const result = await this.ordersService.closeOrder(id);
      
      // Log da operação para auditoria
      const auditInfo = {
        orderId: id,
        userId,
        userRole,
        tableNumber: result.order.table.number,
        finalAmount: result.summary.totals.finalTotal,
        timestamp: new Date().toISOString(),
      };
      
      logger.log(`Comanda fechada com sucesso: ${JSON.stringify(auditInfo)}`);
      
      // Retornar resposta estruturada
      return {
        message: 'Comanda fechada com sucesso',
        order: result.order,
        summary: result.summary,
        closedBy: {
          userId,
          role: userRole,
          timestamp: auditInfo.timestamp,
        },
      };
    } catch (error) {
      logger.error(`Erro ao fechar comanda ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancelar comanda
   * Apenas admins podem cancelar comandas
   */
  @Post(':id/cancel')
  @Roles(UserRole.ADMIN)
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelOrder(id);
  }

  /**
   * Deletar comanda
   * Apenas admins podem deletar comandas
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id);
  }

  // ===== ENDPOINTS PARA GERENCIAMENTO DE STATUS DOS ITENS =====

  /**
   * Buscar todos os itens de pedidos
   * Todos os usuários autenticados podem ver os itens
   */
  @Get('items/all')
  async findAllItems() {
    return this.orderItemsService.findAll();
  }

  /**
   * Buscar itens por status
   */
  @Get('items/status/:status')
  async findItemsByStatus(@Param('status') status: OrderItemStatus) {
    return this.orderItemsService.findByStatus(status);
  }

  /**
   * Buscar itens pendentes para a cozinha
   * Principalmente para usuários da cozinha
   */
  @Get('items/kitchen/pending')
  @Roles(UserRole.ADMIN, UserRole.KITCHEN)
  async findPendingForKitchen() {
    return this.orderItemsService.findPendingForKitchen();
  }

  /**
   * Buscar itens prontos para entrega
   * Principalmente para garçons
   */
  @Get('items/ready')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  async findReadyForDelivery() {
    return this.orderItemsService.findReadyForDelivery();
  }

  /**
   * Buscar item específico
   */
  @Get('items/:itemId')
  async findOneItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.orderItemsService.findOne(itemId);
  }

  @Patch('items/:itemId/status')
  @ApiOperation({ 
    summary: 'Atualizar status de um item',
    description: 'Atualiza o status de um item específico da comanda. Permissões são validadas baseado no role do usuário.'
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID do item da comanda',
    type: String,
    format: 'uuid'
  })
  @ApiBody({ type: UpdateOrderItemStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Status do item atualizado com sucesso'
  })
  @ApiResponse({
    status: 400,
    description: 'Status inválido ou transição não permitida'
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para esta transição de status'
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado'
  })
  async updateItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateStatusDto: UpdateOrderItemStatusDto,
    @Request() req,
  ) {
    // Usar o ID do usuário logado como updatedBy
    const dto = { ...updateStatusDto, updatedBy: req.user.sub };
    return this.orderItemsService.updateStatus(itemId, dto);
  }

  /**
   * Marcar item como em preparo
   * Apenas cozinha e admin
   */
  @Post('items/:itemId/start-preparation')
  @Roles(UserRole.ADMIN, UserRole.KITCHEN)
  async startPreparation(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req,
  ) {
    return this.orderItemsService.markAsInPreparation(itemId, req.user.sub);
  }

  /**
   * Marcar item como pronto
   * Apenas cozinha e admin
   */
  @Post('items/:itemId/mark-ready')
  @Roles(UserRole.ADMIN, UserRole.KITCHEN)
  async markReady(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req,
  ) {
    return this.orderItemsService.markAsReady(itemId, req.user.sub);
  }

  /**
   * Marcar item como entregue
   * Apenas garçons e admin
   */
  @Post('items/:itemId/mark-delivered')
  @Roles(UserRole.ADMIN, UserRole.WAITER)
  async markDelivered(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req,
  ) {
    return this.orderItemsService.markAsDelivered(itemId, req.user.sub);
  }

  /**
   * Cancelar item
   * Garçons, cozinha e admin podem cancelar em situações específicas
   */
  @Post('items/:itemId/cancel')
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN)
  async cancelItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req,
  ) {
    return this.orderItemsService.cancelItem(itemId, req.user.sub);
  }

  /**
   * Buscar estatísticas de status dos itens
   * Apenas admin
   */
  @Get('items/statistics/status')
  @Roles(UserRole.ADMIN)
  async getStatusStatistics() {
    return this.orderItemsService.getStatusStatistics();
  }

  /**
   * Buscar itens de uma comanda específica
   */
  @Get(':id/items')
  async findOrderItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderItemsService.findByOrder(id);
  }

  /**
   * Contar itens por status para uma comanda
   */
  @Get(':id/items/count-by-status')
  async countItemsByStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderItemsService.countByStatusForOrder(id);
  }

  /**
   * Verificar se todos os itens estão prontos
   */
  @Get(':id/items/all-ready')
  async areAllItemsReady(@Param('id', ParseUUIDPipe) id: string) {
    const allReady = await this.orderItemsService.areAllItemsReadyForOrder(id);
    return { allReady };
  }

  /**
   * Verificar se há itens pendentes
   */
  @Get(':id/items/has-pending')
  async hasPendingItems(@Param('id', ParseUUIDPipe) id: string) {
    const hasPending = await this.orderItemsService.hasPendingItemsForOrder(id);
    return { hasPending };
  }
}