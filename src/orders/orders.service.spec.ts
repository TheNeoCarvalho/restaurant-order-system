import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { TableStatus } from '../common/enums/table-status.enum';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { TableOccupiedException, OrderNotFoundException } from './exceptions';
import { OrdersGateway } from '../websocket/orders.gateway';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let tableRepository: Repository<Table>;
  let menuItemRepository: Repository<MenuItem>;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTableRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockMenuItemRepository = {
    findOne: jest.fn(),
  };

  const mockOrdersGateway = {
    notifyNewOrder: jest.fn(),
    notifyOrderItemStatusUpdate: jest.fn(),
    notifyTableStatusUpdate: jest.fn(),
    notifyOrderClosed: jest.fn(),
    notifyTableOrderUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersGateway,
          useValue: mockOrdersGateway,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockTableRepository,
        },
        {
          provide: getRepositoryToken(MenuItem),
          useValue: mockMenuItemRepository,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    tableRepository = module.get<Repository<Table>>(getRepositoryToken(Table));
    menuItemRepository = module.get<Repository<MenuItem>>(getRepositoryToken(MenuItem));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto = { tableId: 1, items: [] };
      const waiterId = 'waiter-uuid';
      const mockTable = { id: 1, number: 1, status: TableStatus.AVAILABLE };
      const mockOrder = { 
        id: 'order-uuid', 
        tableId: 1, 
        waiterId, 
        status: OrderStatus.OPEN,
        totalAmount: 0 
      };

      mockTableRepository.findOne.mockResolvedValue(mockTable);
      mockOrderRepository.findOne.mockResolvedValue(null); // No existing order
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(mockOrder);
      mockOrderRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...mockOrder,
        table: mockTable,
        waiter: { id: waiterId },
        items: []
      });

      const result = await service.create(createOrderDto, waiterId);

      expect(mockTableRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        tableId: 1,
        waiterId,
        status: OrderStatus.OPEN,
        totalAmount: 0,
      });
      expect(mockTableRepository.update).toHaveBeenCalledWith(1, { 
        status: TableStatus.OCCUPIED 
      });
      expect(result).toBeDefined();
    });

    it('should throw TableOccupiedException when table is already occupied', async () => {
      const createOrderDto = { tableId: 1, items: [] };
      const waiterId = 'waiter-uuid';
      const mockTable = { id: 1, number: 1, status: TableStatus.AVAILABLE };
      const existingOrder = { id: 'existing-order', tableId: 1, status: OrderStatus.OPEN };

      mockTableRepository.findOne.mockResolvedValue(mockTable);
      mockOrderRepository.findOne.mockResolvedValue(existingOrder);

      await expect(service.create(createOrderDto, waiterId))
        .rejects.toThrow(TableOccupiedException);
    });
  });

  describe('findOne', () => {
    it('should return an order when found', async () => {
      const orderId = 'order-uuid';
      const mockOrder = { 
        id: orderId, 
        tableId: 1, 
        status: OrderStatus.OPEN,
        items: []
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId);

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: orderId },
        relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      const orderId = 'non-existent-order';
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(orderId))
        .rejects.toThrow(OrderNotFoundException);
    });
  });

  describe('addItemToOrder', () => {
    it('should add item to order successfully', async () => {
      const orderId = 'order-uuid';
      const addItemDto = {
        menuItemId: 'menu-item-uuid',
        quantity: 2,
        specialInstructions: 'No onions'
      };

      const mockOrder = { 
        id: orderId, 
        status: OrderStatus.OPEN,
        items: [],
        updateTotal: jest.fn()
      };
      const mockMenuItem = {
        id: 'menu-item-uuid',
        name: 'Burger',
        price: 15.99,
        isAvailable: true
      };
      const mockOrderItem = {
        id: 'order-item-uuid',
        orderId,
        menuItemId: 'menu-item-uuid',
        quantity: 2,
        unitPrice: 15.99,
        specialInstructions: 'No onions',
        status: OrderItemStatus.PENDING
      };

      mockOrderRepository.findOne
        .mockResolvedValueOnce(mockOrder) // First call in addItemToOrder
        .mockResolvedValueOnce({ ...mockOrder, items: [mockOrderItem] }) // Second call in updateOrderTotal
        .mockResolvedValueOnce({ 
          ...mockOrder, 
          items: [mockOrderItem],
          table: { id: 1, number: 1 },
          waiter: { id: 'waiter-uuid', name: 'Test Waiter' }
        }); // Third call in findOne at the end

      mockMenuItemRepository.findOne.mockResolvedValue(mockMenuItem);
      mockOrderItemRepository.create.mockReturnValue(mockOrderItem);
      mockOrderItemRepository.save.mockResolvedValue(mockOrderItem);
      mockOrderRepository.save.mockResolvedValue(mockOrder);

      const result = await service.addItemToOrder(orderId, addItemDto);

      expect(mockMenuItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'menu-item-uuid' }
      });
      expect(mockOrderItemRepository.create).toHaveBeenCalledWith({
        orderId,
        menuItemId: 'menu-item-uuid',
        quantity: 2,
        unitPrice: 15.99,
        specialInstructions: 'No onions',
        status: OrderItemStatus.PENDING,
      });
      expect(result).toBeDefined();
    });
  });
});