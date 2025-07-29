import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItemsService } from './order-items.service';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { OrderItemStatus } from '../common/enums/order-item-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { 
  OrderItemNotFoundException, 
  InvalidStatusTransitionException,
  UnauthorizedStatusUpdateException 
} from './exceptions';
import { OrdersGateway } from '../websocket/orders.gateway';

describe('OrderItemsService', () => {
  let service: OrderItemsService;
  let orderItemRepository: Repository<OrderItem>;
  let userRepository: Repository<User>;

  const mockOrderItemRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockOrdersGateway = {
    notifyNewOrder: jest.fn(),
    notifyOrderItemStatusUpdate: jest.fn(),
    notifyTableStatusUpdate: jest.fn(),
    notifyOrderClosed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemsService,
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: OrdersGateway,
          useValue: mockOrdersGateway,
        },
      ],
    }).compile();

    service = module.get<OrderItemsService>(OrderItemsService);
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return an order item when found', async () => {
      const itemId = 'item-uuid';
      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.PENDING,
        quantity: 2,
        unitPrice: 15.99
      };

      mockOrderItemRepository.findOne.mockResolvedValue(mockOrderItem);

      const result = await service.findOne(itemId);

      expect(mockOrderItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: itemId },
        relations: ['order', 'order.table', 'order.waiter', 'menuItem', 'statusUpdatedBy'],
      });
      expect(result).toEqual(mockOrderItem);
    });

    it('should throw OrderItemNotFoundException when item not found', async () => {
      const itemId = 'non-existent-item';
      mockOrderItemRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(itemId))
        .rejects.toThrow(OrderItemNotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully when user has permission', async () => {
      const itemId = 'item-uuid';
      const userId = 'user-uuid';
      const updateDto = {
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: userId
      };

      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.PENDING,
        canUpdateStatus: jest.fn().mockReturnValue(true),
        statusUpdatedById: null
      };

      const mockUser = {
        id: userId,
        role: UserRole.KITCHEN
      };

      mockOrderItemRepository.findOne
        .mockResolvedValueOnce(mockOrderItem) // First call in findOne
        .mockResolvedValueOnce({ ...mockOrderItem, status: OrderItemStatus.IN_PREPARATION }); // Second call at the end

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrderItemRepository.save.mockResolvedValue(mockOrderItem);

      const result = await service.updateStatus(itemId, updateDto);

      expect(mockOrderItem.canUpdateStatus).toHaveBeenCalledWith(OrderItemStatus.IN_PREPARATION);
      expect(mockOrderItemRepository.save).toHaveBeenCalledWith(mockOrderItem);
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedStatusUpdateException when user lacks permission', async () => {
      const itemId = 'item-uuid';
      const userId = 'user-uuid';
      const updateDto = {
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: userId
      };

      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.PENDING,
        canUpdateStatus: jest.fn().mockReturnValue(true)
      };

      const mockUser = {
        id: userId,
        role: UserRole.WAITER // Waiter cannot set IN_PREPARATION status
      };

      mockOrderItemRepository.findOne.mockResolvedValue(mockOrderItem);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.updateStatus(itemId, updateDto))
        .rejects.toThrow(UnauthorizedStatusUpdateException);
    });

    it('should throw InvalidStatusTransitionException for invalid transition', async () => {
      const itemId = 'item-uuid';
      const userId = 'user-uuid';
      const updateDto = {
        status: OrderItemStatus.PENDING,
        updatedBy: userId
      };

      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.DELIVERED,
        canUpdateStatus: jest.fn().mockReturnValue(false) // Cannot go back to PENDING from DELIVERED
      };

      const mockUser = {
        id: userId,
        role: UserRole.ADMIN
      };

      mockOrderItemRepository.findOne.mockResolvedValue(mockOrderItem);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.updateStatus(itemId, updateDto))
        .rejects.toThrow(InvalidStatusTransitionException);
    });
  });

  describe('findByStatus', () => {
    it('should return items with specified status', async () => {
      const status = OrderItemStatus.READY;
      const mockItems = [
        { id: 'item1', status: OrderItemStatus.READY },
        { id: 'item2', status: OrderItemStatus.READY }
      ];

      mockOrderItemRepository.find.mockResolvedValue(mockItems);

      const result = await service.findByStatus(status);

      expect(mockOrderItemRepository.find).toHaveBeenCalledWith({
        where: { status },
        relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(mockItems);
    });
  });

  describe('markAsReady', () => {
    it('should mark item as ready', async () => {
      const itemId = 'item-uuid';
      const userId = 'user-uuid';

      const mockOrderItem = {
        id: itemId,
        status: OrderItemStatus.IN_PREPARATION,
        canUpdateStatus: jest.fn().mockReturnValue(true)
      };

      const mockUser = {
        id: userId,
        role: UserRole.KITCHEN
      };

      mockOrderItemRepository.findOne
        .mockResolvedValueOnce(mockOrderItem)
        .mockResolvedValueOnce({ ...mockOrderItem, status: OrderItemStatus.READY });

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrderItemRepository.save.mockResolvedValue(mockOrderItem);

      const result = await service.markAsReady(itemId, userId);

      expect(result).toBeDefined();
    });
  });
});