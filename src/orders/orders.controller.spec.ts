import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderItemsService } from '../order-items/order-items.service';
import { CreateOrderDto, AddItemToOrderDto } from './dto';
import { UpdateOrderItemStatusDto } from '../order-items/dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;
  let orderItemsService: OrderItemsService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByTable: jest.fn(),
    findActiveOrderByTable: jest.fn(),
    update: jest.fn(),
    addItemToOrder: jest.fn(),
    removeItemFromOrder: jest.fn(),
    updateItemQuantity: jest.fn(),
    closeOrder: jest.fn(),
    cancelOrder: jest.fn(),
    remove: jest.fn(),
  };

  const mockOrderItemsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByStatus: jest.fn(),
    findPendingForKitchen: jest.fn(),
    findReadyForDelivery: jest.fn(),
    updateStatus: jest.fn(),
    markAsInPreparation: jest.fn(),
    markAsReady: jest.fn(),
    markAsDelivered: jest.fn(),
    cancelItem: jest.fn(),
    getStatusStatistics: jest.fn(),
    findByOrder: jest.fn(),
    countByStatusForOrder: jest.fn(),
    areAllItemsReadyForOrder: jest.fn(),
    hasPendingItemsForOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: OrderItemsService,
          useValue: mockOrderItemsService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
    orderItemsService = module.get<OrderItemsService>(OrderItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const createOrderDto: CreateOrderDto = {
        tableId: 1,
        items: []
      };
      const mockRequest = { user: { sub: 'waiter-uuid' } };
      const mockOrder = {
        id: 'order-uuid',
        tableId: 1,
        waiterId: 'waiter-uuid',
        status: OrderStatus.OPEN,
        items: []
      };

      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(createOrderDto, mockRequest);

      expect(mockOrdersService.create).toHaveBeenCalledWith(createOrderDto, 'waiter-uuid');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      const mockOrders = [
        { id: 'order1', status: OrderStatus.OPEN },
        { id: 'order2', status: OrderStatus.CLOSED }
      ];

      mockOrdersService.findAll.mockResolvedValue(mockOrders);

      const result = await controller.findAll();

      expect(mockOrdersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });
  });

  describe('findOne', () => {
    it('should return a specific order', async () => {
      const orderId = 'order-uuid';
      const mockOrder = {
        id: orderId,
        status: OrderStatus.OPEN,
        items: []
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(orderId);

      expect(mockOrdersService.findOne).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('addItem', () => {
    it('should add item to order', async () => {
      const orderId = 'order-uuid';
      const addItemDto: AddItemToOrderDto = {
        menuItemId: 'menu-item-uuid',
        quantity: 2,
        specialInstructions: 'No onions'
      };
      const mockOrder = {
        id: orderId,
        items: [{ id: 'item-uuid', quantity: 2 }]
      };

      mockOrdersService.addItemToOrder.mockResolvedValue(mockOrder);

      const result = await controller.addItem(orderId, addItemDto);

      expect(mockOrdersService.addItemToOrder).toHaveBeenCalledWith(orderId, addItemDto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('updateItemStatus', () => {
    it('should update item status', async () => {
      const itemId = 'item-uuid';
      const updateStatusDto: UpdateOrderItemStatusDto = {
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: 'user-uuid'
      };
      const mockRequest = { user: { sub: 'user-uuid' } };
      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.IN_PREPARATION
      };

      mockOrderItemsService.updateStatus.mockResolvedValue(mockOrderItem);

      const result = await controller.updateItemStatus(itemId, updateStatusDto, mockRequest);

      expect(mockOrderItemsService.updateStatus).toHaveBeenCalledWith(itemId, {
        ...updateStatusDto,
        updatedBy: 'user-uuid'
      });
      expect(result).toEqual(mockOrderItem);
    });
  });

  describe('startPreparation', () => {
    it('should mark item as in preparation', async () => {
      const itemId = 'item-uuid';
      const mockRequest = { user: { sub: 'kitchen-user-uuid' } };
      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.IN_PREPARATION
      };

      mockOrderItemsService.markAsInPreparation.mockResolvedValue(mockOrderItem);

      const result = await controller.startPreparation(itemId, mockRequest);

      expect(mockOrderItemsService.markAsInPreparation).toHaveBeenCalledWith(itemId, 'kitchen-user-uuid');
      expect(result).toEqual(mockOrderItem);
    });
  });

  describe('markReady', () => {
    it('should mark item as ready', async () => {
      const itemId = 'item-uuid';
      const mockRequest = { user: { sub: 'kitchen-user-uuid' } };
      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.READY
      };

      mockOrderItemsService.markAsReady.mockResolvedValue(mockOrderItem);

      const result = await controller.markReady(itemId, mockRequest);

      expect(mockOrderItemsService.markAsReady).toHaveBeenCalledWith(itemId, 'kitchen-user-uuid');
      expect(result).toEqual(mockOrderItem);
    });
  });

  describe('markDelivered', () => {
    it('should mark item as delivered', async () => {
      const itemId = 'item-uuid';
      const mockRequest = { user: { sub: 'waiter-user-uuid' } };
      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.DELIVERED
      };

      mockOrderItemsService.markAsDelivered.mockResolvedValue(mockOrderItem);

      const result = await controller.markDelivered(itemId, mockRequest);

      expect(mockOrderItemsService.markAsDelivered).toHaveBeenCalledWith(itemId, 'waiter-user-uuid');
      expect(result).toEqual(mockOrderItem);
    });
  });

  describe('closeOrder', () => {
    it('should close an order', async () => {
      const orderId = 'order-uuid';
      const mockOrder = {
        id: orderId,
        status: OrderStatus.CLOSED,
        closedAt: new Date(),
        table: { number: 1 },
        waiter: { name: 'Test Waiter' },
        items: []
      };
      
      const mockSummary = {
        orderId,
        tableNumber: 1,
        waiterName: 'Test Waiter',
        openedAt: new Date(),
        closedAt: new Date(),
        items: [],
        totals: {
          subtotal: 0,
          serviceCharge: 0,
          taxAmount: 0,
          finalTotal: 0,
          serviceChargeRate: 0.10,
          taxRate: 0.08,
        },
        totalItems: 0,
        totalQuantity: 0,
      };

      const mockServiceResult = { order: mockOrder, summary: mockSummary };
      mockOrdersService.closeOrder.mockResolvedValue(mockServiceResult);

      const mockReq = {
        user: {
          sub: 'user-uuid',
          role: 'waiter'
        }
      };

      const result = await controller.closeOrder(orderId, mockReq);

      expect(mockOrdersService.closeOrder).toHaveBeenCalledWith(orderId);
      expect(result.message).toBe('Comanda fechada com sucesso');
      expect(result.order).toEqual(mockOrder);
      expect(result.summary).toEqual(mockSummary);
      expect(result.closedBy.userId).toBe('user-uuid');
      expect(result.closedBy.role).toBe('waiter');
    });
  });

  describe('findPendingForKitchen', () => {
    it('should return pending items for kitchen', async () => {
      const mockItems = [
        { id: 'item1', status: OrderItemStatus.PENDING },
        { id: 'item2', status: OrderItemStatus.IN_PREPARATION }
      ];

      mockOrderItemsService.findPendingForKitchen.mockResolvedValue(mockItems);

      const result = await controller.findPendingForKitchen();

      expect(mockOrderItemsService.findPendingForKitchen).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });
  });

  describe('areAllItemsReady', () => {
    it('should check if all items are ready', async () => {
      const orderId = 'order-uuid';
      mockOrderItemsService.areAllItemsReadyForOrder.mockResolvedValue(true);

      const result = await controller.areAllItemsReady(orderId);

      expect(mockOrderItemsService.areAllItemsReadyForOrder).toHaveBeenCalledWith(orderId);
      expect(result).toEqual({ allReady: true });
    });
  });
});