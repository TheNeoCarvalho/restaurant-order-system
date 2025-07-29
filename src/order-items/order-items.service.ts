import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { UpdateOrderItemStatusDto } from './dto';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { 
  OrderItemNotFoundException, 
  InvalidStatusTransitionException,
  UnauthorizedStatusUpdateException 
} from './exceptions';
import { OrdersGateway } from '../websocket/orders.gateway';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * Buscar todos os itens de pedido
   */
  async findAll(): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Buscar um item de pedido por ID
   */
  async findOne(id: string): Promise<OrderItem> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id },
      relations: ['order', 'order.table', 'order.waiter', 'menuItem', 'statusUpdatedBy'],
    });

    if (!orderItem) {
      throw new OrderItemNotFoundException(id);
    }

    return orderItem;
  }

  /**
   * Buscar itens por status
   */
  async findByStatus(status: OrderItemStatus): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      where: { status },
      relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Buscar itens pendentes para a cozinha
   */
  async findPendingForKitchen(): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      where: [
        { status: OrderItemStatus.PENDING },
        { status: OrderItemStatus.IN_PREPARATION }
      ],
      relations: ['order', 'order.table', 'menuItem'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Buscar itens prontos para entrega
   */
  async findReadyForDelivery(): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      where: { status: OrderItemStatus.READY },
      relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
      order: { updatedAt: 'ASC' },
    });
  }

  /**
   * Atualizar status de um item de pedido
   */
  async updateStatus(
    id: string, 
    updateStatusDto: UpdateOrderItemStatusDto
  ): Promise<OrderItem> {
    const { status, updatedBy } = updateStatusDto;

    // Buscar o item
    const orderItem = await this.findOne(id);

    // Buscar o usuário que está fazendo a atualização
    const user = await this.userRepository.findOne({
      where: { id: updatedBy }
    });

    if (!user) {
      throw new BadRequestException(`Usuário ${updatedBy} não encontrado`);
    }

    // Validar se o usuário tem permissão para fazer essa alteração
    this.validateUserPermission(user.role, status);

    // Validar se a transição de status é válida
    if (!orderItem.canUpdateStatus(status)) {
      throw new InvalidStatusTransitionException(orderItem.status, status);
    }

    // Atualizar o status
    orderItem.status = status;
    orderItem.statusUpdatedById = updatedBy;

    await this.orderItemRepository.save(orderItem);

    const updatedOrderItem = await this.findOne(id);

    // Notificar sobre mudança de status do item
    this.ordersGateway.notifyOrderItemStatusUpdate(updatedOrderItem);

    // Notificar sobre atualização do painel geral de mesas
    if (updatedOrderItem.order?.table) {
      this.ordersGateway.notifyTableOrderUpdate(updatedOrderItem.order.table.id, {
        orderId: updatedOrderItem.order.id,
        totalAmount: updatedOrderItem.order.totalAmount,
        itemsCount: updatedOrderItem.order.items?.length || 0,
        waiterName: updatedOrderItem.order.waiter?.name,
        status: updatedOrderItem.order.status,
        itemStatusUpdate: {
          itemId: updatedOrderItem.id,
          newStatus: status,
          menuItemName: updatedOrderItem.menuItem?.name,
        },
      });
    }

    return updatedOrderItem;
  }

  /**
   * Marcar item como em preparo (apenas cozinha)
   */
  async markAsInPreparation(id: string, userId: string): Promise<OrderItem> {
    return this.updateStatus(id, {
      status: OrderItemStatus.IN_PREPARATION,
      updatedBy: userId
    });
  }

  /**
   * Marcar item como pronto (apenas cozinha)
   */
  async markAsReady(id: string, userId: string): Promise<OrderItem> {
    return this.updateStatus(id, {
      status: OrderItemStatus.READY,
      updatedBy: userId
    });
  }

  /**
   * Marcar item como entregue (garçom ou admin)
   */
  async markAsDelivered(id: string, userId: string): Promise<OrderItem> {
    return this.updateStatus(id, {
      status: OrderItemStatus.DELIVERED,
      updatedBy: userId
    });
  }

  /**
   * Cancelar item (garçom, admin ou cozinha em casos específicos)
   */
  async cancelItem(id: string, userId: string): Promise<OrderItem> {
    return this.updateStatus(id, {
      status: OrderItemStatus.CANCELLED,
      updatedBy: userId
    });
  }

  /**
   * Buscar histórico de status de um item
   */
  async getStatusHistory(id: string): Promise<OrderItem[]> {
    // Para um histórico completo, seria necessário uma tabela de auditoria
    // Por enquanto, retornamos apenas o estado atual
    const orderItem = await this.findOne(id);
    return [orderItem];
  }

  /**
   * Buscar estatísticas de itens por status
   */
  async getStatusStatistics(): Promise<Record<OrderItemStatus, number>> {
    const statistics = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('orderItem.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('orderItem.status')
      .getRawMany();

    const result: Record<OrderItemStatus, number> = {
      [OrderItemStatus.PENDING]: 0,
      [OrderItemStatus.IN_PREPARATION]: 0,
      [OrderItemStatus.READY]: 0,
      [OrderItemStatus.DELIVERED]: 0,
      [OrderItemStatus.CANCELLED]: 0,
    };

    statistics.forEach(stat => {
      result[stat.status as OrderItemStatus] = parseInt(stat.count);
    });

    return result;
  }

  /**
   * Validar permissões do usuário para atualizar status
   */
  private validateUserPermission(userRole: UserRole, newStatus: OrderItemStatus): void {
    const permissions: Record<UserRole, OrderItemStatus[]> = {
      [UserRole.ADMIN]: [
        OrderItemStatus.PENDING,
        OrderItemStatus.IN_PREPARATION,
        OrderItemStatus.READY,
        OrderItemStatus.DELIVERED,
        OrderItemStatus.CANCELLED
      ],
      [UserRole.WAITER]: [
        OrderItemStatus.DELIVERED,
        OrderItemStatus.CANCELLED
      ],
      [UserRole.KITCHEN]: [
        OrderItemStatus.IN_PREPARATION,
        OrderItemStatus.READY,
        OrderItemStatus.CANCELLED
      ]
    };

    const allowedStatuses = permissions[userRole] || [];
    
    if (!allowedStatuses.includes(newStatus)) {
      throw new UnauthorizedStatusUpdateException(userRole, newStatus);
    }
  }

  /**
   * Buscar itens por pedido
   */
  async findByOrder(orderId: string): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      where: { orderId },
      relations: ['menuItem', 'statusUpdatedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Contar itens por status para um pedido específico
   */
  async countByStatusForOrder(orderId: string): Promise<Record<OrderItemStatus, number>> {
    const statistics = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('orderItem.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('orderItem.orderId = :orderId', { orderId })
      .groupBy('orderItem.status')
      .getRawMany();

    const result: Record<OrderItemStatus, number> = {
      [OrderItemStatus.PENDING]: 0,
      [OrderItemStatus.IN_PREPARATION]: 0,
      [OrderItemStatus.READY]: 0,
      [OrderItemStatus.DELIVERED]: 0,
      [OrderItemStatus.CANCELLED]: 0,
    };

    statistics.forEach(stat => {
      result[stat.status as OrderItemStatus] = parseInt(stat.count);
    });

    return result;
  }

  /**
   * Verificar se todos os itens de um pedido estão prontos
   */
  async areAllItemsReadyForOrder(orderId: string): Promise<boolean> {
    const items = await this.findByOrder(orderId);
    
    if (items.length === 0) {
      return false;
    }

    return items.every(item => 
      item.status === OrderItemStatus.DELIVERED || 
      item.status === OrderItemStatus.CANCELLED
    );
  }

  /**
   * Verificar se há itens pendentes em um pedido
   */
  async hasPendingItemsForOrder(orderId: string): Promise<boolean> {
    const count = await this.orderItemRepository.count({
      where: [
        { orderId, status: OrderItemStatus.PENDING },
        { orderId, status: OrderItemStatus.IN_PREPARATION }
      ]
    });

    return count > 0;
  }
}