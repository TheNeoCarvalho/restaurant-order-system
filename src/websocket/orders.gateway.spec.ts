import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OrdersGateway } from './orders.gateway';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import { Socket } from 'socket.io';

describe('OrdersGateway', () => {
  let gateway: OrdersGateway;
  let jwtService: JwtService;
  let usersService: UsersService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.WAITER,
    isActive: true,
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<OrdersGateway>(OrdersGateway);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate user and add to connected clients', async () => {
      const mockSocket = {
        id: 'socket-1',
        handshake: {
          auth: { token: 'valid-token' },
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        connectionId: undefined,
        lastHeartbeat: undefined,
        reconnectAttempts: undefined,
      } as any;

      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockUsersService.findById.mockResolvedValue(mockUser);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(mockSocket.connectionId).toBeDefined();
      expect(mockSocket.lastHeartbeat).toBeDefined();
      expect(mockSocket.reconnectAttempts).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        message: 'Conectado com sucesso',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          role: mockUser.role,
        },
        isReconnection: false,
        connectionId: mockSocket.connectionId,
        serverTime: expect.any(Number),
        heartbeatInterval: expect.any(Number),
      }));
      expect(mockSocket.join).toHaveBeenCalledWith('waiters');
    });

    it('should disconnect client with invalid token', async () => {
      const mockSocket = {
        id: 'socket-1',
        handshake: {
          auth: { token: 'invalid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client without token', async () => {
      const mockSocket = {
        id: 'socket-1',
        handshake: {
          auth: {},
        },
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('canJoinRoom', () => {
    it('should allow admin to join any room', () => {
      const canJoinAdmins = (gateway as any).canJoinRoom(UserRole.ADMIN, 'admins');
      const canJoinWaiters = (gateway as any).canJoinRoom(UserRole.ADMIN, 'waiters');
      const canJoinKitchen = (gateway as any).canJoinRoom(UserRole.ADMIN, 'kitchen');
      const canJoinGeneral = (gateway as any).canJoinRoom(UserRole.ADMIN, 'general');

      expect(canJoinAdmins).toBe(true);
      expect(canJoinWaiters).toBe(true);
      expect(canJoinKitchen).toBe(true);
      expect(canJoinGeneral).toBe(true);
    });

    it('should restrict waiter to specific rooms', () => {
      const canJoinWaiters = (gateway as any).canJoinRoom(UserRole.WAITER, 'waiters');
      const canJoinGeneral = (gateway as any).canJoinRoom(UserRole.WAITER, 'general');
      const canJoinKitchen = (gateway as any).canJoinRoom(UserRole.WAITER, 'kitchen');
      const canJoinAdmins = (gateway as any).canJoinRoom(UserRole.WAITER, 'admins');

      expect(canJoinWaiters).toBe(true);
      expect(canJoinGeneral).toBe(true);
      expect(canJoinKitchen).toBe(false);
      expect(canJoinAdmins).toBe(false);
    });

    it('should restrict kitchen to specific rooms', () => {
      const canJoinKitchen = (gateway as any).canJoinRoom(UserRole.KITCHEN, 'kitchen');
      const canJoinGeneral = (gateway as any).canJoinRoom(UserRole.KITCHEN, 'general');
      const canJoinWaiters = (gateway as any).canJoinRoom(UserRole.KITCHEN, 'waiters');
      const canJoinAdmins = (gateway as any).canJoinRoom(UserRole.KITCHEN, 'admins');

      expect(canJoinKitchen).toBe(true);
      expect(canJoinGeneral).toBe(true);
      expect(canJoinWaiters).toBe(false);
      expect(canJoinAdmins).toBe(false);
    });
  });

  describe('notification methods', () => {
    beforeEach(() => {
      gateway.server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;
    });

    it('should notify new order to kitchen', () => {
      const mockOrder = {
        id: 'order-1',
        table: { number: 5 },
        waiter: { id: 'waiter-1', name: 'John Doe' },
        items: [
          {
            id: 'item-1',
            menuItem: { name: 'Pizza' },
            quantity: 2,
            specialInstructions: 'Extra cheese',
            status: 'pending',
          },
        ],
        createdAt: new Date(),
      } as any;

      gateway.notifyNewOrder(mockOrder);

      expect(gateway.server.to).toHaveBeenCalledWith('kitchen');
      expect(gateway.server.emit).toHaveBeenCalledWith('new-order', expect.objectContaining({
        orderId: mockOrder.id,
        tableNumber: mockOrder.table.number,
        waiterName: mockOrder.waiter.name,
        items: [
          {
            id: 'item-1',
            menuItemName: 'Pizza',
            quantity: 2,
            specialInstructions: 'Extra cheese',
            status: 'pending',
          },
        ],
        createdAt: mockOrder.createdAt,
        version: expect.any(Number),
      }));
    });

    it('should notify table status update to all users', () => {
      const mockTable = {
        id: 1,
        number: 5,
        status: 'occupied',
        capacity: 4,
        updatedAt: new Date(),
      } as any;

      gateway.notifyTableStatusUpdate(mockTable);

      expect(gateway.server.emit).toHaveBeenCalledWith('table-status-updated', expect.objectContaining({
        tableId: mockTable.id,
        tableNumber: mockTable.number,
        status: mockTable.status,
        capacity: mockTable.capacity,
        updatedAt: mockTable.updatedAt,
        version: expect.any(Number),
      }));
    });
  });

  describe('getConnectionStats', () => {
    it('should return connection statistics', () => {
      const stats = gateway.getConnectionStats();

      expect(stats).toEqual({
        totalConnections: 0,
        totalSessions: 0,
        usersByRole: {
          [UserRole.ADMIN]: 0,
          [UserRole.WAITER]: 0,
          [UserRole.KITCHEN]: 0,
        },
        reconnections: 0,
      });
    });
  });

  describe('reconnection and synchronization', () => {
    beforeEach(() => {
      gateway.server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;
    });

    it('should detect reconnection for existing user', async () => {
      const mockSocket1 = {
        id: 'socket-1',
        handshake: { auth: { token: 'valid-token' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        connectionId: undefined,
        lastHeartbeat: undefined,
        reconnectAttempts: undefined,
      } as any;

      const mockSocket2 = {
        id: 'socket-2',
        handshake: { auth: { token: 'valid-token' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        connectionId: undefined,
        lastHeartbeat: undefined,
        reconnectAttempts: undefined,
      } as any;

      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockUsersService.findById.mockResolvedValue(mockUser);

      // Primeira conexão
      await gateway.handleConnection(mockSocket1);
      expect(mockSocket1.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        isReconnection: false,
      }));

      // Segunda conexão (reconexão)
      await gateway.handleConnection(mockSocket2);
      expect(mockSocket2.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        isReconnection: true,
      }));
    });

    it('should handle version conflict resolution', async () => {
      const mockSocket = {
        id: 'socket-1',
        user: mockUser,
        emit: jest.fn(),
      } as any;

      const conflictData = {
        resourceType: 'order',
        resourceId: 'order-1',
        clientVersion: 100,
        conflictStrategy: 'server-wins' as const,
      };

      await gateway.handleConflictResolution(mockSocket, conflictData);

      expect(mockSocket.emit).toHaveBeenCalledWith('conflict-resolved', expect.objectContaining({
        strategy: 'server-wins',
        conflictId: expect.any(String),
        serverVersion: expect.any(Number),
        timestamp: expect.any(String),
      }));
    });

    it('should handle sync requests', async () => {
      const mockSocket = {
        id: 'socket-1',
        user: mockUser,
        emit: jest.fn(),
      } as any;

      await gateway.handleSyncRequest(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('sync-data', expect.objectContaining({
        timestamp: expect.any(String),
        serverTime: expect.any(Number),
      }));
    });

    it('should handle full sync requests', async () => {
      const mockSocket = {
        id: 'socket-1',
        user: mockUser,
        emit: jest.fn(),
      } as any;

      const syncRequest = {
        lastSyncVersion: 0,
        resources: ['orders', 'tables'],
      };

      await gateway.handleFullSyncRequest(mockSocket, syncRequest);

      expect(mockSocket.emit).toHaveBeenCalledWith('full-sync-data', expect.objectContaining({
        syncVersion: expect.any(Number),
        timestamp: expect.any(String),
        resources: expect.any(Object),
      }));
    });

    it('should handle message acknowledgments', async () => {
      const mockSocket = {
        id: 'socket-1',
        user: mockUser,
      } as any;

      const ackData = {
        messageId: 'msg-123',
        status: 'received' as const,
      };

      await gateway.handleMessageAcknowledgment(mockSocket, ackData);

      // Should not throw error and log the acknowledgment
      expect(true).toBe(true); // Test passes if no error is thrown
    });

    it('should handle connectivity status updates', async () => {
      const mockSocket = {
        id: 'socket-1',
        user: mockUser,
        emit: jest.fn(),
      } as any;

      const connectivityData = {
        status: 'poor' as const,
        latency: 1500,
        reconnectAttempts: 3,
      };

      await gateway.handleConnectivityStatus(mockSocket, connectivityData);

      expect(mockSocket.emit).toHaveBeenCalledWith('adjust-update-frequency', expect.objectContaining({
        heartbeatInterval: expect.any(Number),
        batchUpdates: true,
        reducedData: true,
      }));
    });
  });
});