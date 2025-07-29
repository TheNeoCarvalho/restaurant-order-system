import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import io, { Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Table } from '../src/tables/entities/table.entity';
import { MenuItem } from '../src/menu/entities/menu-item.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/order-items/entities/order-item.entity';
import { UserRole } from '../src/users/enums/user-role.enum';
import { TableStatus } from '../src/common/enums/table-status.enum';
import { OrderItemStatus } from '../src/common/enums/order-item-status.enum';
import * as bcrypt from 'bcryptjs';

describe('WebSocket Real-time Synchronization E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let waiter2Token: string;
  let adminUser: User;
  let waiterUser: User;
  let waiter2User: User;
  let kitchenUser: User;
  let testTable1: Table;
  let testTable2: Table;
  let testMenuItem1: MenuItem;
  let testMenuItem2: MenuItem;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();
    
    dataSource = app.get(DataSource);
    
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up orders and order items before each test
    const orderItemRepository = dataSource.getRepository(OrderItem);
    const orderRepository = dataSource.getRepository(Order);
    
    // Delete all order items first
    const orderItems = await orderItemRepository.find();
    if (orderItems.length > 0) {
      await orderItemRepository.remove(orderItems);
    }
    
    // Delete all orders
    const orders = await orderRepository.find();
    if (orders.length > 0) {
      await orderRepository.remove(orders);
    }
    
    // Reset table statuses
    await dataSource.getRepository(Table).update(
      { id: testTable1.id },
      { status: TableStatus.AVAILABLE }
    );
    await dataSource.getRepository(Table).update(
      { id: testTable2.id },
      { status: TableStatus.AVAILABLE }
    );
  });

  async function setupTestData() {
    const userRepository = dataSource.getRepository(User);
    const tableRepository = dataSource.getRepository(Table);
    const menuItemRepository = dataSource.getRepository(MenuItem);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    adminUser = await userRepository.save({
      email: 'admin-ws@test.com',
      password: hashedPassword,
      name: 'Admin WebSocket Test',
      role: UserRole.ADMIN,
      isActive: true,
    });

    waiterUser = await userRepository.save({
      email: 'waiter-ws@test.com',
      password: hashedPassword,
      name: 'Waiter WebSocket Test',
      role: UserRole.WAITER,
      isActive: true,
    });

    waiter2User = await userRepository.save({
      email: 'waiter2-ws@test.com',
      password: hashedPassword,
      name: 'Waiter2 WebSocket Test',
      role: UserRole.WAITER,
      isActive: true,
    });

    kitchenUser = await userRepository.save({
      email: 'kitchen-ws@test.com',
      password: hashedPassword,
      name: 'Kitchen WebSocket Test',
      role: UserRole.KITCHEN,
      isActive: true,
    });

    // Create test tables
    testTable1 = await tableRepository.save({
      number: 101,
      capacity: 4,
      status: TableStatus.AVAILABLE,
    });

    testTable2 = await tableRepository.save({
      number: 102,
      capacity: 2,
      status: TableStatus.AVAILABLE,
    });

    // Create test menu items
    testMenuItem1 = await menuItemRepository.save({
      name: 'WebSocket Pizza',
      description: 'Pizza for WebSocket testing',
      price: 22.99,
      category: 'Main Course',
      isAvailable: true,
      preparationTime: 20,
    });

    testMenuItem2 = await menuItemRepository.save({
      name: 'WebSocket Salad',
      description: 'Salad for WebSocket testing',
      price: 12.99,
      category: 'Appetizer',
      isAvailable: true,
      preparationTime: 5,
    });

    // Get authentication tokens
    adminToken = await getAuthToken('admin-ws@test.com', 'password123');
    waiterToken = await getAuthToken('waiter-ws@test.com', 'password123');
    waiter2Token = await getAuthToken('waiter2-ws@test.com', 'password123');
    kitchenToken = await getAuthToken('kitchen-ws@test.com', 'password123');
  }

  async function cleanupTestData() {
    const userRepository = dataSource.getRepository(User);
    const tableRepository = dataSource.getRepository(Table);
    const menuItemRepository = dataSource.getRepository(MenuItem);
    const orderItemRepository = dataSource.getRepository(OrderItem);
    const orderRepository = dataSource.getRepository(Order);

    // Clean up in proper order due to foreign key constraints
    const orderItems = await orderItemRepository.find();
    if (orderItems.length > 0) {
      await orderItemRepository.remove(orderItems);
    }
    
    const orders = await orderRepository.find();
    if (orders.length > 0) {
      await orderRepository.remove(orders);
    }
    
    const menuItems = await menuItemRepository.find();
    if (menuItems.length > 0) {
      await menuItemRepository.remove(menuItems);
    }
    
    const tables = await tableRepository.find();
    if (tables.length > 0) {
      await tableRepository.remove(tables);
    }
    
    const users = await userRepository.find();
    if (users.length > 0) {
      await userRepository.remove(users);
    }
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken;
  }

  function createSocketClient(token: string): Promise<typeof Socket> {
    return new Promise((resolve, reject) => {
      const client = io(`http://localhost:${process.env.PORT || 3000}/orders`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => resolve(client));
      client.on('connect_error', reject);
      
      setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
    });
  }

  async function createTestOrder(token: string, tableId: number, items: any[] = []): Promise<any> {
    const defaultItems = items.length > 0 ? items : [
      {
        menuItemId: testMenuItem1.id,
        quantity: 1,
      },
    ];

    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableId,
        items: defaultItems,
      });

    return response.body;
  }

  describe('Order Creation Notifications', () => {
    let waiterSocket: typeof Socket;
    let kitchenSocket: typeof Socket;
    let adminSocket: typeof Socket;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      kitchenSocket = await createSocketClient(kitchenToken);
      adminSocket = await createSocketClient(adminToken);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      kitchenSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should notify kitchen when new order is created', (done) => {
      let kitchenNotified = false;
      let adminNotified = false;

      kitchenSocket.on('order-created', (data) => {
        expect(data.orderId).toBeDefined();
        expect(data.tableNumber).toBe(testTable1.number);
        expect(data.waiterName).toBe('Waiter WebSocket Test');
        expect(data.items).toHaveLength(1);
        expect(data.items[0].menuItemName).toBe('WebSocket Pizza');
        expect(data.items[0].quantity).toBe(2);
        expect(data.items[0].specialInstructions).toBe('Extra cheese');
        kitchenNotified = true;
        
        if (adminNotified) done();
      });

      adminSocket.on('order-created', (data) => {
        expect(data.orderId).toBeDefined();
        adminNotified = true;
        
        if (kitchenNotified) done();
      });

      // Create order after setting up listeners
      setTimeout(async () => {
        await createTestOrder(waiterToken, testTable1.id, [
          {
            menuItemId: testMenuItem1.id,
            quantity: 2,
            specialInstructions: 'Extra cheese',
          },
        ]);
      }, 100);
    });

    it('should notify about new orders to kitchen room specifically', (done) => {
      kitchenSocket.on('new-order', (data) => {
        expect(data.orderId).toBeDefined();
        expect(data.tableNumber).toBe(testTable1.number);
        expect(data.items).toHaveLength(1);
        done();
      });

      setTimeout(async () => {
        await createTestOrder(waiterToken, testTable1.id);
      }, 100);
    });

    it('should not notify waiters about order creation (they created it)', (done) => {
      let orderCreated = false;
      let timeoutReached = false;

      waiterSocket.on('order-created', () => {
        if (!timeoutReached) {
          done(new Error('Waiter should not receive order-created notification'));
        }
      });

      setTimeout(async () => {
        await createTestOrder(waiterToken, testTable1.id);
        orderCreated = true;
      }, 100);

      setTimeout(() => {
        timeoutReached = true;
        if (orderCreated) {
          done(); // Test passes if no notification was received
        }
      }, 1000);
    });
  });

  describe('Order Item Status Updates', () => {
    let waiterSocket: typeof Socket;
    let kitchenSocket: typeof Socket;
    let adminSocket: typeof Socket;
    let testOrder: any;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      kitchenSocket = await createSocketClient(kitchenToken);
      adminSocket = await createSocketClient(adminToken);
      
      testOrder = await createTestOrder(waiterToken, testTable1.id);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      kitchenSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should notify waiters when kitchen updates item status', (done) => {
      const orderItemId = testOrder.items[0].id;

      waiterSocket.on('order-item-status-updated', (data) => {
        expect(data.orderItemId).toBe(orderItemId);
        expect(data.status).toBe(OrderItemStatus.IN_PREPARATION);
        expect(data.updatedBy).toBe('Kitchen WebSocket Test');
        expect(data.menuItemName).toBe('WebSocket Pizza');
        done();
      });

      setTimeout(async () => {
        await request(app.getHttpServer())
          .patch(`/order-items/${orderItemId}/status`)
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({ status: OrderItemStatus.IN_PREPARATION });
      }, 100);
    });

    it('should notify kitchen when item is cancelled', (done) => {
      const orderItemId = testOrder.items[0].id;

      kitchenSocket.on('order-item-cancelled', (data) => {
        expect(data.orderItemId).toBe(orderItemId);
        expect(data.status).toBe(OrderItemStatus.CANCELLED);
        expect(data.updatedBy).toBe('Waiter WebSocket Test');
        done();
      });

      setTimeout(async () => {
        await request(app.getHttpServer())
          .patch(`/order-items/${orderItemId}/status`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({ status: OrderItemStatus.CANCELLED });
      }, 100);
    });

    it('should notify all relevant users about status changes', (done) => {
      const orderItemId = testOrder.items[0].id;
      let waiterNotified = false;
      let adminNotified = false;

      waiterSocket.on('order-item-status-updated', (data) => {
        expect(data.status).toBe(OrderItemStatus.READY);
        waiterNotified = true;
        if (adminNotified) done();
      });

      adminSocket.on('order-item-status-updated', (data) => {
        expect(data.status).toBe(OrderItemStatus.READY);
        adminNotified = true;
        if (waiterNotified) done();
      });

      setTimeout(async () => {
        // First set to in preparation
        await request(app.getHttpServer())
          .patch(`/order-items/${orderItemId}/status`)
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({ status: OrderItemStatus.IN_PREPARATION });

        // Then set to ready
        setTimeout(async () => {
          await request(app.getHttpServer())
            .patch(`/order-items/${orderItemId}/status`)
            .set('Authorization', `Bearer ${kitchenToken}`)
            .send({ status: OrderItemStatus.READY });
        }, 100);
      }, 100);
    });
  });

  describe('Table Status Updates', () => {
    let waiterSocket: typeof Socket;
    let waiter2Socket: typeof Socket;
    let adminSocket: typeof Socket;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      waiter2Socket = await createSocketClient(waiter2Token);
      adminSocket = await createSocketClient(adminToken);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      waiter2Socket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should notify all users when table status changes', (done) => {
      let waiter1Notified = false;
      let waiter2Notified = false;
      let adminNotified = false;

      const checkAllNotified = () => {
        if (waiter1Notified && waiter2Notified && adminNotified) {
          done();
        }
      };

      waiterSocket.on('table-status-updated', (data) => {
        expect(data.tableId).toBe(testTable1.id);
        expect(data.tableNumber).toBe(testTable1.number);
        expect(data.status).toBe(TableStatus.OCCUPIED);
        waiter1Notified = true;
        checkAllNotified();
      });

      waiter2Socket.on('table-status-updated', (data) => {
        expect(data.tableId).toBe(testTable1.id);
        waiter2Notified = true;
        checkAllNotified();
      });

      adminSocket.on('table-status-updated', (data) => {
        expect(data.tableId).toBe(testTable1.id);
        adminNotified = true;
        checkAllNotified();
      });

      setTimeout(async () => {
        await createTestOrder(waiterToken, testTable1.id);
      }, 100);
    });

    it('should notify about table overview updates', (done) => {
      waiterSocket.on('tables-overview-update', (data) => {
        expect(data.timestamp).toBeDefined();
        expect(data.message).toBe('Painel de mesas atualizado');
        done();
      });

      setTimeout(async () => {
        await createTestOrder(waiterToken, testTable1.id);
      }, 100);
    });
  });

  describe('Tables Overview Real-time Updates', () => {
    let waiterSocket: typeof Socket;
    let adminSocket: typeof Socket;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      adminSocket = await createSocketClient(adminToken);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should allow joining tables overview room and receive updates', (done) => {
      waiterSocket.emit('join-tables-overview');

      waiterSocket.on('joined-tables-overview', (data) => {
        expect(data.message).toBe('Conectado ao painel de mesas em tempo real');
        expect(data.timestamp).toBeDefined();

        // Now listen for overview updates
        waiterSocket.on('tables-overview-refresh', (refreshData) => {
          expect(refreshData.message).toBe('Dados do painel atualizados - refresh necessário');
          done();
        });

        // Create order to trigger update
        setTimeout(async () => {
          await createTestOrder(waiter2Token, testTable1.id);
        }, 100);
      });
    });

    it('should handle tables overview data requests', (done) => {
      waiterSocket.emit('request-tables-overview', {
        filters: {
          status: 'available',
          sortBy: 'number',
          sortOrder: 'ASC',
        },
      });

      waiterSocket.on('tables-overview-data', (data) => {
        expect(data.tables).toBeInstanceOf(Array);
        expect(data.timestamp).toBeDefined();
        expect(data.filters).toBeDefined();
        expect(data.filters.status).toBe('available');
        done();
      });
    });

    it('should handle table order updates', (done) => {
      waiterSocket.on('table-order-updated', (data) => {
        expect(data.tableId).toBe(testTable1.id);
        expect(data.orderData).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });

      setTimeout(async () => {
        await createTestOrder(waiterToken, testTable1.id);
      }, 100);
    });
  });

  describe('Order Closure Notifications', () => {
    let waiterSocket: typeof Socket;
    let adminSocket: typeof Socket;
    let testOrder: any;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      adminSocket = await createSocketClient(adminToken);
      
      testOrder = await createTestOrder(waiterToken, testTable1.id);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should notify about order closure', (done) => {
      let waiterNotified = false;
      let adminNotified = false;

      const checkBothNotified = () => {
        if (waiterNotified && adminNotified) {
          done();
        }
      };

      waiterSocket.on('order-closed', (data) => {
        expect(data.orderId).toBe(testOrder.id);
        expect(data.tableNumber).toBe(testTable1.number);
        expect(data.totalAmount).toBeDefined();
        expect(data.closedAt).toBeDefined();
        expect(data.waiterName).toBe('Waiter WebSocket Test');
        waiterNotified = true;
        checkBothNotified();
      });

      adminSocket.on('order-closed', (data) => {
        expect(data.orderId).toBe(testOrder.id);
        adminNotified = true;
        checkBothNotified();
      });

      setTimeout(async () => {
        const orderItemId = testOrder.items[0].id;
        
        // Mark item as delivered first
        await request(app.getHttpServer())
          .patch(`/order-items/${orderItemId}/status`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({ status: OrderItemStatus.DELIVERED });

        // Then close the order
        await request(app.getHttpServer())
          .post(`/orders/${testOrder.id}/close`)
          .set('Authorization', `Bearer ${waiterToken}`);
      }, 100);
    });
  });

  describe('Connection Management and Reconnection', () => {
    it('should handle connection with proper authentication', (done) => {
      const socket = io(`http://localhost:${process.env.PORT || 3000}/orders`, {
        auth: { token: waiterToken },
        transports: ['websocket'],
      });

      socket.on('connected', (data) => {
        expect(data.message).toBe('Conectado com sucesso');
        expect(data.user.name).toBe('Waiter WebSocket Test');
        expect(data.user.role).toBe(UserRole.WAITER);
        expect(data.isReconnection).toBe(false);
        expect(data.connectionId).toBeDefined();
        expect(data.syncData).toBeDefined();
        socket.disconnect();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const socket = io(`http://localhost:${process.env.PORT || 3000}/orders`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      socket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      socket.on('connected', () => {
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('should handle reconnection properly', (done) => {
      let firstConnectionId: string;
      let reconnectionHandled = false;

      const socket = io(`http://localhost:${process.env.PORT || 3000}/orders`, {
        auth: { token: waiterToken },
        transports: ['websocket'],
      });

      socket.on('connected', (data) => {
        if (!firstConnectionId) {
          // First connection
          firstConnectionId = data.connectionId;
          expect(data.isReconnection).toBe(false);
          
          // Disconnect and reconnect
          socket.disconnect();
          
          setTimeout(() => {
            socket.connect();
          }, 500);
        } else {
          // Reconnection
          expect(data.isReconnection).toBe(true);
          expect(data.connectionId).toBeDefined();
          expect(data.syncData).toBeDefined();
          reconnectionHandled = true;
          socket.disconnect();
          done();
        }
      });
    });

    it('should handle sync requests properly', (done) => {
      const socket = io(`http://localhost:${process.env.PORT || 3000}/orders`, {
        auth: { token: waiterToken },
        transports: ['websocket'],
      });

      socket.on('connected', () => {
        socket.emit('request-sync');
      });

      socket.on('sync-data', (data) => {
        expect(data.timestamp).toBeDefined();
        expect(data.serverTime).toBeDefined();
        expect(data.activeOrders).toBeDefined();
        expect(data.tableStatuses).toBeDefined();
        socket.disconnect();
        done();
      });
    });

    it('should handle full sync requests', (done) => {
      const socket = io(`http://localhost:${process.env.PORT || 3000}/orders`, {
        auth: { token: adminToken },
        transports: ['websocket'],
      });

      socket.on('connected', () => {
        socket.emit('request-full-sync', {
          lastSyncVersion: 0,
          resources: ['orders', 'tables'],
        });
      });

      socket.on('full-sync-data', (data) => {
        expect(data.syncVersion).toBeDefined();
        expect(data.timestamp).toBeDefined();
        expect(data.activeOrders).toBeDefined();
        expect(data.tableStatuses).toBeDefined();
        expect(data.pendingOrders).toBeDefined();
        expect(data.systemStats).toBeDefined();
        socket.disconnect();
        done();
      });
    });
  });

  describe('Conflict Resolution', () => {
    let waiterSocket: typeof Socket;
    let adminSocket: typeof Socket;
    let testOrder: any;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      adminSocket = await createSocketClient(adminToken);
      
      testOrder = await createTestOrder(waiterToken, testTable1.id);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should handle version conflicts with server-wins strategy', (done) => {
      const orderItemId = testOrder.items[0].id;

      waiterSocket.emit('resolve-conflict', {
        resourceType: 'order-item',
        resourceId: orderItemId,
        clientVersion: 1,
        conflictStrategy: 'server-wins',
      });

      waiterSocket.on('conflict-resolved', (data) => {
        expect(data.strategy).toBe('server-wins');
        expect(data.conflictId).toBeDefined();
        expect(data.serverVersion).toBeDefined();
        expect(data.data).toBeDefined();
        done();
      });
    });

    it('should handle version checks', (done) => {
      const orderItemId = testOrder.items[0].id;

      waiterSocket.emit('check-version', {
        resourceType: 'order-item',
        resourceId: orderItemId,
        clientVersion: 1,
      });

      waiterSocket.on('version-check-result', (data) => {
        expect(data.resourceType).toBe('order-item');
        expect(data.resourceId).toBe(orderItemId);
        expect(data.clientVersion).toBe(1);
        expect(data.serverVersion).toBeDefined();
        expect(data.hasConflict).toBeDefined();
        done();
      });
    });

    it('should broadcast state changes to all connected clients', (done) => {
      const orderItemId = testOrder.items[0].id;
      let waiterReceived = false;
      let adminReceived = false;

      const checkBothReceived = () => {
        if (waiterReceived && adminReceived) {
          done();
        }
      };

      waiterSocket.on('order-item-status-updated', () => {
        waiterReceived = true;
        checkBothReceived();
      });

      adminSocket.on('order-item-status-updated', () => {
        adminReceived = true;
        checkBothReceived();
      });

      setTimeout(async () => {
        await request(app.getHttpServer())
          .patch(`/order-items/${orderItemId}/status`)
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({ status: OrderItemStatus.IN_PREPARATION });
      }, 100);
    });
  });

  describe('Room Management', () => {
    let waiterSocket: typeof Socket;
    let kitchenSocket: typeof Socket;
    let adminSocket: typeof Socket;

    beforeEach(async () => {
      waiterSocket = await createSocketClient(waiterToken);
      kitchenSocket = await createSocketClient(kitchenToken);
      adminSocket = await createSocketClient(adminToken);
    });

    afterEach(() => {
      waiterSocket?.disconnect();
      kitchenSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should allow joining authorized rooms', (done) => {
      waiterSocket.emit('join-room', { room: 'general' });

      waiterSocket.on('joined-room', (data) => {
        expect(data.room).toBe('general');
        done();
      });
    });

    it('should reject joining unauthorized rooms', (done) => {
      waiterSocket.emit('join-room', { room: 'kitchen' });

      waiterSocket.on('error', (data) => {
        expect(data.message).toBe('Não autorizado a entrar nesta room');
        expect(data.room).toBe('kitchen');
        done();
      });
    });

    it('should allow admin to join any room', (done) => {
      let kitchenJoined = false;
      let waitersJoined = false;

      const checkBothJoined = () => {
        if (kitchenJoined && waitersJoined) {
          done();
        }
      };

      adminSocket.emit('join-room', { room: 'kitchen' });
      adminSocket.emit('join-room', { room: 'waiters' });

      adminSocket.on('joined-room', (data) => {
        if (data.room === 'kitchen') {
          kitchenJoined = true;
          checkBothJoined();
        } else if (data.room === 'waiters') {
          waitersJoined = true;
          checkBothJoined();
        }
      });
    });

    it('should handle leaving rooms', (done) => {
      waiterSocket.emit('join-room', { room: 'general' });

      waiterSocket.on('joined-room', () => {
        waiterSocket.emit('leave-room', { room: 'general' });
      });

      waiterSocket.on('left-room', (data) => {
        expect(data.room).toBe('general');
        done();
      });
    });
  });

  describe('Multiple Concurrent Users', () => {
    let waiter1Socket: typeof Socket;
    let waiter2Socket: typeof Socket;
    let kitchenSocket: typeof Socket;
    let adminSocket: typeof Socket;

    beforeEach(async () => {
      waiter1Socket = await createSocketClient(waiterToken);
      waiter2Socket = await createSocketClient(waiter2Token);
      kitchenSocket = await createSocketClient(kitchenToken);
      adminSocket = await createSocketClient(adminToken);
    });

    afterEach(() => {
      waiter1Socket?.disconnect();
      waiter2Socket?.disconnect();
      kitchenSocket?.disconnect();
      adminSocket?.disconnect();
    });

    it('should handle multiple orders from different waiters simultaneously', (done) => {
      let order1Notified = false;
      let order2Notified = false;
      let notificationCount = 0;

      const checkBothOrders = () => {
        notificationCount++;
        if (notificationCount >= 2) {
          done();
        }
      };

      kitchenSocket.on('order-created', (data) => {
        if (data.tableNumber === testTable1.number) {
          order1Notified = true;
        } else if (data.tableNumber === testTable2.number) {
          order2Notified = true;
        }
        checkBothOrders();
      });

      setTimeout(async () => {
        // Create orders simultaneously
        const promises = [
          createTestOrder(waiterToken, testTable1.id),
          createTestOrder(waiter2Token, testTable2.id),
        ];

        await Promise.all(promises);
      }, 100);
    });

    it('should synchronize status updates across all relevant users', (done) => {
      let waiter1Updated = false;
      let waiter2Updated = false;
      let adminUpdated = false;
      let updateCount = 0;

      const checkAllUpdated = () => {
        updateCount++;
        if (updateCount >= 3) {
          done();
        }
      };

      setTimeout(async () => {
        const order = await createTestOrder(waiterToken, testTable1.id);
        const orderItemId = order.items[0].id;

        waiter1Socket.on('order-item-status-updated', () => {
          waiter1Updated = true;
          checkAllUpdated();
        });

        waiter2Socket.on('order-item-status-updated', () => {
          waiter2Updated = true;
          checkAllUpdated();
        });

        adminSocket.on('order-item-status-updated', () => {
          adminUpdated = true;
          checkAllUpdated();
        });

        setTimeout(async () => {
          await request(app.getHttpServer())
            .patch(`/order-items/${orderItemId}/status`)
            .set('Authorization', `Bearer ${kitchenToken}`)
            .send({ status: OrderItemStatus.IN_PREPARATION });
        }, 200);
      }, 100);
    });

    it('should handle concurrent table status changes', (done) => {
      let table1Updates = 0;
      let table2Updates = 0;

      const checkBothTables = () => {
        if (table1Updates > 0 && table2Updates > 0) {
          done();
        }
      };

      waiter1Socket.on('table-status-updated', (data) => {
        if (data.tableNumber === testTable1.number) {
          table1Updates++;
        } else if (data.tableNumber === testTable2.number) {
          table2Updates++;
        }
        checkBothTables();
      });

      setTimeout(async () => {
        // Create orders on both tables simultaneously
        await Promise.all([
          createTestOrder(waiterToken, testTable1.id),
          createTestOrder(waiter2Token, testTable2.id),
        ]);
      }, 100);
    });
  });
});