import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto, AddItemToOrderDto, UpdateOrderDto } from './dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { TableStatus } from '../common/enums/table-status.enum';
import { 
  TableOccupiedException, 
  OrderNotFoundException, 
  MenuItemNotAvailableException 
} from './exceptions';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  /**
   * Criar uma nova comanda para uma mesa
   */
  async create(createOrderDto: CreateOrderDto, waiterId: string): Promise<Order> {
    const { tableId, items = [] } = createOrderDto;

    // Verificar se a mesa existe
    const table = await this.tableRepository.findOne({ 
      where: { id: tableId } 
    });
    
    if (!table) {
      throw new NotFoundException(`Mesa ${tableId} não encontrada`);
    }

    // Verificar se a mesa está disponível
    await this.validateTableAvailability(tableId);

    // Criar a comanda
    const order = this.orderRepository.create({
      tableId,
      waiterId,
      status: OrderStatus.OPEN,
      totalAmount: 0,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Adicionar itens se fornecidos
    if (items.length > 0) {
      for (const itemDto of items) {
        await this.addItemToOrder(savedOrder.id, itemDto);
      }
    }

    // Atualizar status da mesa para ocupada
    await this.tableRepository.update(tableId, { 
      status: TableStatus.OCCUPIED 
    });

    // Retornar a comanda com os itens
    return this.findOne(savedOrder.id);
  }

  /**
   * Buscar todas as comandas
   */
  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['table', 'waiter', 'items', 'items.menuItem'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Buscar uma comanda por ID
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
    });

    if (!order) {
      throw new OrderNotFoundException(id);
    }

    return order;
  }

  /**
   * Buscar comandas por mesa
   */
  async findByTable(tableId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { tableId, status: OrderStatus.OPEN },
      relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Buscar comanda ativa de uma mesa
   */
  async findActiveOrderByTable(tableId: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { tableId, status: OrderStatus.OPEN },
      relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
    });
  }

  /**
   * Adicionar item a uma comanda existente
   */
  async addItemToOrder(orderId: string, addItemDto: AddItemToOrderDto): Promise<Order> {
    const { menuItemId, quantity, specialInstructions } = addItemDto;

    // Verificar se a comanda existe e está aberta
    const order = await this.findOne(orderId);
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Não é possível adicionar itens a uma comanda fechada');
    }

    // Verificar se o item do menu existe e está disponível
    const menuItem = await this.menuItemRepository.findOne({
      where: { id: menuItemId }
    });

    if (!menuItem) {
      throw new NotFoundException(`Item do menu ${menuItemId} não encontrado`);
    }

    if (!menuItem.isAvailable) {
      throw new MenuItemNotAvailableException(menuItem.name);
    }

    // Criar o item do pedido
    const orderItem = this.orderItemRepository.create({
      orderId,
      menuItemId,
      quantity,
      unitPrice: menuItem.price,
      specialInstructions,
      status: OrderItemStatus.PENDING,
    });

    await this.orderItemRepository.save(orderItem);

    // Recalcular e atualizar o total da comanda
    await this.updateOrderTotal(orderId);

    return this.findOne(orderId);
  }

  /**
   * Remover item de uma comanda
   */
  async removeItemFromOrder(orderId: string, itemId: string): Promise<Order> {
    // Verificar se a comanda existe
    const order = await this.findOne(orderId);
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Não é possível remover itens de uma comanda fechada');
    }

    // Verificar se o item existe na comanda
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: itemId, orderId }
    });

    if (!orderItem) {
      throw new NotFoundException(`Item ${itemId} não encontrado na comanda`);
    }

    // Verificar se o item pode ser removido (não foi enviado para a cozinha)
    if (orderItem.status !== OrderItemStatus.PENDING) {
      throw new BadRequestException(
        'Não é possível remover itens que já foram enviados para a cozinha. Use cancelamento.'
      );
    }

    // Remover o item
    await this.orderItemRepository.remove(orderItem);

    // Recalcular o total da comanda
    await this.updateOrderTotal(orderId);

    return this.findOne(orderId);
  }

  /**
   * Atualizar quantidade de um item na comanda
   */
  async updateItemQuantity(
    orderId: string, 
    itemId: string, 
    newQuantity: number
  ): Promise<Order> {
    if (newQuantity < 1) {
      throw new BadRequestException('Quantidade deve ser maior que 0');
    }

    // Verificar se a comanda existe
    const order = await this.findOne(orderId);
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Não é possível modificar itens de uma comanda fechada');
    }

    // Verificar se o item existe na comanda
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: itemId, orderId }
    });

    if (!orderItem) {
      throw new NotFoundException(`Item ${itemId} não encontrado na comanda`);
    }

    // Verificar se o item pode ser modificado
    if (orderItem.status !== OrderItemStatus.PENDING) {
      throw new BadRequestException(
        'Não é possível modificar itens que já foram enviados para a cozinha'
      );
    }

    // Atualizar a quantidade
    orderItem.quantity = newQuantity;
    await this.orderItemRepository.save(orderItem);

    // Recalcular o total da comanda
    await this.updateOrderTotal(orderId);

    return this.findOne(orderId);
  }

  /**
   * Atualizar comanda
   */
  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Não é possível atualizar uma comanda fechada');
    }

    await this.orderRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  /**
   * Fechar comanda (será implementado em tarefa posterior)
   */
  async closeOrder(id: string): Promise<Order> {
    const order = await this.findOne(id);
    
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Comanda já está fechada');
    }

    // Verificar se há itens pendentes
    const pendingItems = order.items.filter(item => 
      item.status === OrderItemStatus.PENDING || 
      item.status === OrderItemStatus.IN_PREPARATION
    );

    if (pendingItems.length > 0) {
      throw new BadRequestException(
        'Não é possível fechar a comanda. Existem itens pendentes na cozinha.'
      );
    }

    // Atualizar status da comanda
    order.status = OrderStatus.CLOSED;
    order.closedAt = new Date();
    await this.orderRepository.save(order);

    // Liberar a mesa
    await this.tableRepository.update(order.tableId, { 
      status: TableStatus.AVAILABLE 
    });

    return this.findOne(id);
  }

  /**
   * Cancelar comanda
   */
  async cancelOrder(id: string): Promise<Order> {
    const order = await this.findOne(id);
    
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Apenas comandas abertas podem ser canceladas');
    }

    // Cancelar todos os itens
    for (const item of order.items) {
      if (item.canBeCancelled()) {
        item.status = OrderItemStatus.CANCELLED;
        await this.orderItemRepository.save(item);
      }
    }

    // Atualizar status da comanda
    order.status = OrderStatus.CANCELLED;
    order.closedAt = new Date();
    await this.orderRepository.save(order);

    // Liberar a mesa
    await this.tableRepository.update(order.tableId, { 
      status: TableStatus.AVAILABLE 
    });

    return this.findOne(id);
  }

  /**
   * Remover comanda (soft delete)
   */
  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }

  /**
   * Validar se a mesa está disponível para nova comanda
   */
  private async validateTableAvailability(tableId: number): Promise<void> {
    const existingOrder = await this.orderRepository.findOne({
      where: { tableId, status: OrderStatus.OPEN },
    });

    if (existingOrder) {
      const table = await this.tableRepository.findOne({ 
        where: { id: tableId } 
      });
      throw new TableOccupiedException(table?.number || tableId);
    }
  }

  /**
   * Recalcular e atualizar o total da comanda
   */
  private async updateOrderTotal(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (order) {
      order.updateTotal();
      await this.orderRepository.save(order);
    }
  }
}