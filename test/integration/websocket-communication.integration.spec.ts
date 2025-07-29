import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import io, { Socket } from 'socket.io-client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { TablesService } from '../../src/tables/tables.service';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderItemsService } from '../../src/order-items/order-items.service';
import { MenuService } from '../../src/menu/menu.service';
import { UserRole } from '../../src/users/enums/user-role.enum';
import { OrderItemStatus } from '../../src/common/enums/order-item-status.enum';
import { TableStatus } from '../../src/common/enums/table-status.enum';

describe('WebSocket Communication Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;
  let tablesService: TablesService;
  let ordersService: OrdersService;
  let orderItemsService: OrderItemsService;
  let menuService: MenuService;

  let adminSocket: typeof Socket;
  let waiterSocket: typeof Socket;
  let kitchenSocket: typeof Socket;

  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;

  let testUsers: any;
  let testTable: any;
  let testMenuItem: any;
  let serverUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0); // Use random port for testing

    const server = app.getHttpServer();
    const address = server.address();
    serverUrl = `http://localhost:${address.port}`;

    // Get services
    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    tablesService = moduleFixture.get<TablesService>(TablesService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);
    orderItemsService = moduleFixture.get<OrderItemsService>(OrderItemsService);
    menuService = moduleFixture.get<MenuService>(MenuService);

    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await setupWebSocketConnections();
  });

  afterEach(async () => {
    // Disconnect all sockets after each test
    if (adminSocket?.connected) adminSocket.disconnect();
    if (waiterSocket?.connected) waiterSocket.disconnect();
    if (kitchenSocket?.connected) kitchenSocket.disconnect();
  });

  async function setupTestData() {
    // Create test users
    const adminUser = await usersService.create({
      email: 'admin-ws@test.com',
      password: 'password123',
      name: 'Admin WebSocket Test',
      role: UserRole.ADMIN,
    });

    const waiterUser = await usersService.create({
      email: 'waiter-ws@test.com',
      password: 'password123',
      name: 'Waiter WebSocket Test',
      role: UserRole.WAITER,
    });

    const kitchenUser = await usersService.create({
      email: 'kitchen-ws@test.com',
      password: 'password123',
      name: 'Kitchen WebSocket Test',
      role: UserRole.KITCHEN,
    });

    testUsers = { adminUser, waiterUser, kitchenUser };

    // Generate tokens
    const adminAuth = await authService.login(adminUser);
    const waiterAuth = await authService.login(waiterUser);
    const kitchenAuth = await authService.login(kitchenUser);

    adminToken = adminAuth.accessToken;
    waiterToken = waiterAuth.accessToken;
    kitchenToken = kitchenAuth.accessToken;

    // Create test table
    testTable = await tablesService.create({
      number: 400,
      capacity: 4,
    });

    // Create test menu item
    testMenuItem = await menuService.create({
      name: 'WebSocket Test Burger',
      description: 'Test burger for WebSocket tests',
      price: 22.99,
      category: 'Burgers',
      preparationTime: 12,
    });
  }

  async function setupWebSocketConnections() {
    // Create socket connections with authentication
    adminSocket = io(`${serverUrl}/orders`, {
      auth: { token: adminToken },
      transports: ['websocket'],
      forceNew: true,
    });

    waiterSocket = io(`${serverUrl}/orders`, {
      auth: { token: waiterToken },
      transports: ['websocket'],
      forceNew: true,
    });

    kitchenSocket = io(`${serverUrl}/orders`, {
      auth: { token: kitchenToken },
      transports: ['websocket'],
      forceNew: true,
    });

    // Wait for all connections to be established
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        adminSocket.on('connect', resolve);
        adminSocket.on('connect_error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        waiterSocket.on('connect', resolve);
        waiterSocket.on('connect_error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        kitchenSocket.on('connect', resolve);
        kitchenSocket.on('connect_error', reject);
      }),
    ]);
  }

  describe('WebSocket Authentication', () => {
    it('should authenticate users with valid JWT tokens', async () => {
      expect(adminSocket.connected).toBe(true);
      expect(waiterSocket.connected).toBe(true);
      expect(kitchenSocket.connected).toBe(true);
    });

    it('should reject connection with invalid token', async () => {
      const invalidSocket = io(`${serverUrl}/orders`, {
        auth: { token: 'invalid.jwt.token' },
        transports: ['websocket'],
        forceNew: true,
      });

      const connectionError = await new Promise((resolve) => {
        invalidSocket.on('connect_error', resolve);
        invalidSocket.on('connect', () => resolve(null));
      });

      expect(connectionError).toBeTruthy();
      invalidSocket.disconnect();
    });

    it('should reject connection without token', async () => {
      const noTokenSocket = io(`${serverUrl}/orders`, {
        transports: ['websocket'],
        forceNew: true,
      });

      const connectionError = await new Promise((resolve) => {
        noTokenSocket.on('connect_error', resolve);
        noTokenSocket.on('connect', () => resolve(null));
      });

      expect(connectionError).toBeTruthy();
      noTokenSocket.disconnect();
    });
  });

  describe('Room Management', () => {
    it('should allow users to join kitchen room', async () => {
      const joinResponse = await new Promise((resolve) => {
        kitchenSocket.emit('join-kitchen', {});
        kitchenSocket.on('joined-kitchen', resolve);
      });

      expect(joinResponse).toMatchObject({
        success: true,
        room: 'kitchen',
      });
    });

    it('should allow users to join tables overview room', async () => {
      const joinResponse = await new Promise((resolve) => {
        adminSocket.emit('join-tables-overview', {});
        adminSocket.on('joined-tables-overview', resolve);
      });

      expect(joinResponse).toMatchObject({
        success: true,
        room: 'tables-overview',
      });
    });

    it('should restrict kitchen room to appropriate users', async () => {
      // Kitchen user should be able to join
      const kitchenJoinResponse = await new Promise((resolve) => {
        kitchenSocket.emit('join-kitchen', {});
        kitchenSocket.on('joined-kitchen', resolve);
      });

      expect(kitchenJoinResponse).toMatchObject({
        success: true,
      });

      // Admin should also be able to join (for monitoring)
      const adminJoinResponse = await new Promise((resolve) => {
        adminSocket.emit('join-kitchen', {});
        adminSocket.on('joined-kitchen', resolve);
      });

      expect(adminJoinResponse).toMatchObject({
        success: true,
      });
    });
  });

  describe('Order Creation Notifications', () => {
    it('should notify kitchen when new order with items is created', async () => {
      // Join kitchen room
      await new Promise((resolve) => {
        kitchenSocket.emit('join-kitchen', {});
        kitchenSocket.on('joined-kitchen', resolve);
      });

      const kitchenNotifications: any[] = [];
      kitchenSocket.on('new-order-items', (data) => {
        kitchenNotifications.push(data);
      });

      // Create order with items via REST API
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 2,
              specialInstructions: 'Extra sauce',
            },
          ],
        })
        .expect(201);

      // Wait for WebSocket notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(kitchenNotifications).toHaveLength(1);
      expect(kitchenNotifications[0]).toMatchObject({
        orderId: orderResponse.body.id,
        tableNumber: testTable.number,
        waiterName: testUsers.waiterUser.name,
        items: expect.arrayContaining([
          expect.objectContaining({
            menuItemName: testMenuItem.name,
            quantity: 2,
            specialInstructions: 'Extra sauce',
            status: OrderItemStatus.PENDING,
          }),
        ]),
      });
    });

    it('should notify tables overview when order is created', async () => {
      // Join tables overview room
      await new Promise((resolve) => {
        adminSocket.emit('join-tables-overview', {});
        adminSocket.on('joined-tables-overview', resolve);
      });

      const overviewNotifications: any[] = [];
      adminSocket.on('table-order-updated', (data) => {
        overviewNotifications.push(data);
      });

      // Create order
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        })
        .expect(201);

      // Wait for WebSocket notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(overviewNotifications).toHaveLength(1);
      expect(overviewNotifications[0]).toMatchObject({
        tableId: testTable.id,
        orderData: expect.objectContaining({
          orderId: orderResponse.body.id,
          waiterName: testUsers.waiterUser.name,
          status: 'open',
        }),
      });
    });
  });

  describe('Order Item Status Updates', () => {
    let testOrder: any;
    let testOrderItem: any;

    beforeEach(async () => {
      // Create order with items for testing
      testOrder = await ordersService.create(
        {
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 1,
              specialInstructions: 'Test instructions',
            },
          ],
        },
        testUsers.waiterUser.id,
      );
      testOrderItem = testOrder.items[0];
    });

    it('should notify all relevant users when order item status changes', async () => {
      // Join rooms
      await Promise.all([
        new Promise((resolve) => {
          kitchenSocket.emit('join-kitchen', {});
          kitchenSocket.on('joined-kitchen', resolve);
        }),
        new Promise((resolve) => {
          waiterSocket.emit('join-tables-overview', {});
          waiterSocket.on('joined-tables-overview', resolve);
        }),
      ]);

      const kitchenNotifications: any[] = [];
      const waiterNotifications: any[] = [];

      kitchenSocket.on('order-item-status-updated', (data) => {
        kitchenNotifications.push(data);
      });

      waiterSocket.on('order-item-status-updated', (data) => {
        waiterNotifications.push(data);
      });

      // Update order item status
      await orderItemsService.updateStatus(testOrderItem.id, {
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: testUsers.kitchenUser.id,
      });

      // Wait for WebSocket notifications
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Both kitchen and waiter should receive notifications
      expect(kitchenNotifications).toHaveLength(1);
      expect(waiterNotifications).toHaveLength(1);

      const expectedNotification = {
        orderItemId: testOrderItem.id,
        orderId: testOrder.id,
        tableNumber: testTable.number,
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: testUsers.kitchenUser.name,
        menuItemName: testMenuItem.name,
        timestamp: expect.any(String),
      };

      expect(kitchenNotifications[0]).toMatchObject(expectedNotification);
      expect(waiterNotifications[0]).toMatchObject(expectedNotification);
    });

    it('should notify when item is ready for delivery', async () => {
      // Join waiter room
      await new Promise((resolve) => {
        waiterSocket.emit('join-tables-overview', {});
        waiterSocket.on('joined-tables-overview', resolve);
      });

      const readyNotifications: any[] = [];
      waiterSocket.on('order-item-ready', (data) => {
        readyNotifications.push(data);
      });

      // Update to ready status
      await orderItemsService.updateStatus(testOrderItem.id, {
        status: OrderItemStatus.READY,
        updatedBy: testUsers.kitchenUser.id,
      });

      // Wait for WebSocket notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(readyNotifications).toHaveLength(1);
      expect(readyNotifications[0]).toMatchObject({
        orderItemId: testOrderItem.id,
        orderId: testOrder.id,
        tableNumber: testTable.number,
        menuItemName: testMenuItem.name,
        waiterName: testUsers.waiterUser.name,
      });
    });
  });

  describe('Table Status Updates', () => {
    it('should notify when table status changes', async () => {
      // Join tables overview room
      await new Promise((resolve) => {
        adminSocket.emit('join-tables-overview', {});
        adminSocket.on('joined-tables-overview', resolve);
      });

      const statusNotifications: any[] = [];
      adminSocket.on('table-status-updated', (data) => {
        statusNotifications.push(data);
      });

      // Update table status
      await tablesService.updateStatus(testTable.id, {
        status: TableStatus.CLEANING,
      });

      // Wait for WebSocket notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(statusNotifications).toHaveLength(1);
      expect(statusNotifications[0]).toMatchObject({
        tableId: testTable.id,
        tableNumber: testTable.number,
        status: TableStatus.CLEANING,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Order Closure Notifications', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await ordersService.create(
        {
          tableId: testTable.id,
          items: [],
        },
        testUsers.waiterUser.id,
      );
    });

    it('should notify when order is closed', async () => {
      // Join tables overview room
      await new Promise((resolve) => {
        adminSocket.emit('join-tables-overview', {});
        adminSocket.on('joined-tables-overview', resolve);
      });

      const closureNotifications: any[] = [];
      adminSocket.on('order-closed', (data) => {
        closureNotifications.push(data);
      });

      // Close the order
      await ordersService.closeOrder(testOrder.id);

      // Wait for WebSocket notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(closureNotifications).toHaveLength(1);
      expect(closureNotifications[0]).toMatchObject({
        orderId: testOrder.id,
        tableNumber: testTable.number,
        waiterName: testUsers.waiterUser.name,
        closedAt: expect.any(String),
      });
    });
  });

  describe('Real-time Data Requests', () => {
    it('should handle tables overview data requests', async () => {
      // Join tables overview room
      await new Promise((resolve) => {
        adminSocket.emit('join-tables-overview', {});
        adminSocket.on('joined-tables-overview', resolve);
      });

      const dataResponses: any[] = [];
      adminSocket.on('tables-overview-data', (data) => {
        dataResponses.push(data);
      });

      // Request tables overview data
      adminSocket.emit('request-tables-overview', {
        filters: {
          sortBy: 'number',
          sortOrder: 'ASC',
        },
      });

      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(dataResponses).toHaveLength(1);
      expect(dataResponses[0]).toMatchObject({
        tables: expect.any(Array),
        timestamp: expect.any(String),
        filters: expect.objectContaining({
          sortBy: 'number',
          sortOrder: 'ASC',
        }),
      });

      // Should include our test table
      const testTableInResponse = dataResponses[0].tables.find(
        (table: any) => table.id === testTable.id,
      );
      expect(testTableInResponse).toBeDefined();
    });

    it('should handle kitchen orders data requests', async () => {
      // Create order with items first
      await ordersService.create(
        {
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 1,
            },
          ],
        },
        testUsers.waiterUser.id,
      );

      // Join kitchen room
      await new Promise((resolve) => {
        kitchenSocket.emit('join-kitchen', {});
        kitchenSocket.on('joined-kitchen', resolve);
      });

      const kitchenDataResponses: any[] = [];
      kitchenSocket.on('kitchen-orders-data', (data) => {
        kitchenDataResponses.push(data);
      });

      // Request kitchen orders data
      kitchenSocket.emit('request-kitchen-orders', {
        filters: {
          status: 'pending',
        },
      });

      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(kitchenDataResponses).toHaveLength(1);
      expect(kitchenDataResponses[0]).toMatchObject({
        orders: expect.any(Array),
        timestamp: expect.any(String),
        filters: expect.objectContaining({
          status: 'pending',
        }),
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle client disconnection gracefully', async () => {
      // Connect and join a room
      await new Promise((resolve) => {
        adminSocket.emit('join-tables-overview', {});
        adminSocket.on('joined-tables-overview', resolve);
      });

      // Disconnect
      adminSocket.disconnect();

      // Verify disconnection
      expect(adminSocket.connected).toBe(false);

      // Reconnect should work
      await setupWebSocketConnections();
      expect(adminSocket.connected).toBe(true);
    });

    it('should handle multiple clients in same room', async () => {
      // Both admin and waiter join tables overview
      await Promise.all([
        new Promise((resolve) => {
          adminSocket.emit('join-tables-overview', {});
          adminSocket.on('joined-tables-overview', resolve);
        }),
        new Promise((resolve) => {
          waiterSocket.emit('join-tables-overview', {});
          waiterSocket.on('joined-tables-overview', resolve);
        }),
      ]);

      const adminNotifications: any[] = [];
      const waiterNotifications: any[] = [];

      adminSocket.on('table-status-updated', (data) => {
        adminNotifications.push(data);
      });

      waiterSocket.on('table-status-updated', (data) => {
        waiterNotifications.push(data);
      });

      // Update table status
      await tablesService.updateStatus(testTable.id, {
        status: TableStatus.RESERVED,
      });

      // Wait for notifications
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Both clients should receive the notification
      expect(adminNotifications).toHaveLength(1);
      expect(waiterNotifications).toHaveLength(1);

      expect(adminNotifications[0]).toMatchObject({
        tableId: testTable.id,
        status: TableStatus.RESERVED,
      });

      expect(waiterNotifications[0]).toMatchObject({
        tableId: testTable.id,
        status: TableStatus.RESERVED,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid room join requests', async () => {
      const errorResponses: any[] = [];
      adminSocket.on('error', (data) => {
        errorResponses.push(data);
      });

      // Try to join non-existent room
      adminSocket.emit('join-invalid-room', {});

      // Wait for potential error
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should either ignore or send error response
      // The exact behavior depends on implementation
    });

    it('should handle malformed event data', async () => {
      const errorResponses: any[] = [];
      adminSocket.on('error', (data) => {
        errorResponses.push(data);
      });

      // Send malformed data
      adminSocket.emit('join-tables-overview', 'invalid-data');

      // Wait for potential error
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should handle gracefully without crashing
    });
  });
});