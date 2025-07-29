import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto, TableOverviewDto, TablesOverviewQueryDto, PendingOrderItemDto } from './dto';
import { TableStatus } from '../common/enums/table-status.enum';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Order } from '../orders/entities/order.entity';
import { OrdersGateway } from '../websocket/orders.gateway';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(createTableDto: CreateTableDto): Promise<Table> {
    // Verificar se já existe uma mesa com o mesmo número
    const existingTable = await this.tableRepository.findOne({
      where: { number: createTableDto.number },
    });

    if (existingTable) {
      throw new ConflictException(`Mesa número ${createTableDto.number} já existe`);
    }

    const table = this.tableRepository.create({
      ...createTableDto,
      capacity: createTableDto.capacity || 4, // Default capacity
    });

    return await this.tableRepository.save(table);
  }

  async findAll(): Promise<Table[]> {
    return await this.tableRepository.find({
      order: { number: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException(`Mesa com ID ${id} não encontrada`);
    }

    return table;
  }

  async findByNumber(number: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { number },
    });

    if (!table) {
      throw new NotFoundException(`Mesa número ${number} não encontrada`);
    }

    return table;
  }

  async update(id: number, updateTableDto: UpdateTableDto): Promise<Table> {
    const table = await this.findOne(id);

    // Se está tentando alterar o número, verificar se não existe outra mesa com esse número
    if (updateTableDto.number && updateTableDto.number !== table.number) {
      const existingTable = await this.tableRepository.findOne({
        where: { number: updateTableDto.number },
      });

      if (existingTable) {
        throw new ConflictException(`Mesa número ${updateTableDto.number} já existe`);
      }
    }

    Object.assign(table, updateTableDto);
    return await this.tableRepository.save(table);
  }

  async updateStatus(id: number, updateStatusDto: UpdateTableStatusDto): Promise<Table> {
    const table = await this.findOne(id);
    table.status = updateStatusDto.status;
    const updatedTable = await this.tableRepository.save(table);
    
    // Notificar sobre mudança de status da mesa
    this.ordersGateway.notifyTableStatusUpdate(updatedTable);
    
    return updatedTable;
  }

  async remove(id: number): Promise<void> {
    const table = await this.findOne(id);
    
    // Verificar se a mesa pode ser removida (não está ocupada)
    if (table.status === TableStatus.OCCUPIED) {
      throw new ConflictException('Não é possível remover uma mesa ocupada');
    }

    await this.tableRepository.remove(table);
  }

  async findAvailable(): Promise<Table[]> {
    return await this.tableRepository.find({
      where: { status: TableStatus.AVAILABLE },
      order: { number: 'ASC' },
    });
  }

  async findOccupied(): Promise<Table[]> {
    return await this.tableRepository.find({
      where: { status: TableStatus.OCCUPIED },
      order: { number: 'ASC' },
    });
  }

  async checkAvailability(id: number): Promise<boolean> {
    const table = await this.findOne(id);
    return table.status === TableStatus.AVAILABLE;
  }

  async getTablesSummary(): Promise<{
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    cleaning: number;
  }> {
    const [total, available, occupied, reserved, cleaning] = await Promise.all([
      this.tableRepository.count(),
      this.tableRepository.count({ where: { status: TableStatus.AVAILABLE } }),
      this.tableRepository.count({ where: { status: TableStatus.OCCUPIED } }),
      this.tableRepository.count({ where: { status: TableStatus.RESERVED } }),
      this.tableRepository.count({ where: { status: TableStatus.CLEANING } }),
    ]);

    return {
      total,
      available,
      occupied,
      reserved,
      cleaning,
    };
  }

  /**
   * Obter visão geral de todas as mesas com informações de pedidos pendentes
   */
  async getTablesOverview(query: TablesOverviewQueryDto = {}): Promise<TableOverviewDto[]> {
    const {
      status,
      hasPendingOrders,
      sortBy = 'number',
      sortOrder = 'ASC',
      includeOrderDetails = false,
    } = query;

    // Buscar todas as mesas com suas comandas ativas
    let tablesQuery = this.tableRepository
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.orders', 'order', 'order.status = :orderStatus', { 
        orderStatus: OrderStatus.OPEN 
      })
      .leftJoinAndSelect('order.waiter', 'waiter')
      .leftJoinAndSelect('order.items', 'orderItem')
      .leftJoinAndSelect('orderItem.menuItem', 'menuItem');

    // Aplicar filtro de status da mesa se fornecido
    if (status) {
      tablesQuery = tablesQuery.where('table.status = :status', { status });
    }

    const tables = await tablesQuery.getMany();

    // Transformar dados para DTO
    let tablesOverview = tables.map(table => this.transformToTableOverview(table, includeOrderDetails));

    // Aplicar filtro de mesas com pedidos pendentes
    if (hasPendingOrders !== undefined) {
      tablesOverview = tablesOverview.filter(table => table.hasPendingOrders === hasPendingOrders);
    }

    // Aplicar ordenação
    tablesOverview = this.sortTablesOverview(tablesOverview, sortBy, sortOrder);

    return tablesOverview;
  }

  /**
   * Transformar entidade Table em TableOverviewDto
   */
  private transformToTableOverview(table: Table, includeOrderDetails: boolean): TableOverviewDto {
    const activeOrder = table.orders?.[0]; // Assumindo que há apenas uma comanda ativa por mesa
    
    let pendingItems = 0;
    let itemsInPreparation = 0;
    let readyItems = 0;
    let totalItems = 0;
    let pendingOrderItems: PendingOrderItemDto[] = [];
    let orderDurationMinutes = 0;

    if (activeOrder) {
      totalItems = activeOrder.items?.length || 0;
      
      // Calcular estatísticas dos itens
      activeOrder.items?.forEach(item => {
        switch (item.status) {
          case OrderItemStatus.PENDING:
            pendingItems++;
            break;
          case OrderItemStatus.IN_PREPARATION:
            itemsInPreparation++;
            break;
          case OrderItemStatus.READY:
            readyItems++;
            break;
        }
      });

      // Calcular duração da comanda
      if (activeOrder.createdAt) {
        const now = new Date();
        orderDurationMinutes = Math.floor((now.getTime() - activeOrder.createdAt.getTime()) / (1000 * 60));
      }

      // Incluir detalhes dos itens pendentes se solicitado
      if (includeOrderDetails) {
        pendingOrderItems = activeOrder.items
          ?.filter(item => 
            item.status === OrderItemStatus.PENDING || 
            item.status === OrderItemStatus.IN_PREPARATION ||
            item.status === OrderItemStatus.READY
          )
          .map(item => ({
            id: item.id,
            menuItemName: item.menuItem?.name || 'Item não encontrado',
            quantity: item.quantity,
            status: item.status,
            specialInstructions: item.specialInstructions,
            createdAt: item.createdAt,
            estimatedPreparationTime: item.menuItem?.preparationTime,
          })) || [];
      }
    }

    const hasPendingOrders = pendingItems > 0 || itemsInPreparation > 0 || readyItems > 0;
    const priority = this.calculateTablePriority(orderDurationMinutes, pendingItems, itemsInPreparation);

    return {
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      status: table.status,
      activeOrderId: activeOrder?.id,
      waiterName: activeOrder?.waiter?.name,
      orderTotal: activeOrder?.totalAmount ? Number(activeOrder.totalAmount) : undefined,
      totalItems: totalItems > 0 ? totalItems : undefined,
      pendingItems: pendingItems > 0 ? pendingItems : undefined,
      itemsInPreparation: itemsInPreparation > 0 ? itemsInPreparation : undefined,
      readyItems: readyItems > 0 ? readyItems : undefined,
      pendingOrderItems: includeOrderDetails ? pendingOrderItems : undefined,
      orderOpenedAt: activeOrder?.createdAt,
      orderDurationMinutes: orderDurationMinutes > 0 ? orderDurationMinutes : undefined,
      hasPendingOrders,
      priority,
    };
  }

  /**
   * Calcular prioridade da mesa baseada no tempo de espera e itens pendentes
   */
  private calculateTablePriority(
    orderDurationMinutes: number, 
    pendingItems: number, 
    itemsInPreparation: number
  ): 'low' | 'medium' | 'high' {
    // Se não há pedidos, prioridade baixa
    if (pendingItems === 0 && itemsInPreparation === 0) {
      return 'low';
    }

    // Prioridade alta se há muitos itens pendentes ou tempo de espera muito longo
    if (pendingItems >= 5 || itemsInPreparation >= 3 || orderDurationMinutes >= 60) {
      return 'high';
    }

    // Prioridade média se há alguns itens pendentes ou tempo moderado
    if (pendingItems >= 2 || itemsInPreparation >= 1 || orderDurationMinutes >= 30) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Ordenar lista de mesas conforme critério especificado
   */
  private sortTablesOverview(
    tables: TableOverviewDto[], 
    sortBy: string, 
    sortOrder: 'ASC' | 'DESC'
  ): TableOverviewDto[] {
    return tables.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'number':
          comparison = a.number - b.number;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'orderDuration':
          const aDuration = a.orderDurationMinutes || 0;
          const bDuration = b.orderDurationMinutes || 0;
          comparison = aDuration - bDuration;
          break;
        case 'pendingItems':
          const aPending = a.pendingItems || 0;
          const bPending = b.pendingItems || 0;
          comparison = aPending - bPending;
          break;
        default:
          comparison = a.number - b.number;
      }

      return sortOrder === 'DESC' ? -comparison : comparison;
    });
  }
}