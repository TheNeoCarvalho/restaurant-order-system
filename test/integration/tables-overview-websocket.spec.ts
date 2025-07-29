import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import io, { Socket } from 'socket.io-client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { TablesService } from '../../src/tables/tables.service';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderItemsService } from '../../src/order-items/order-items.service';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { UserRole } from '../../src/users/enums/user-role.enum';
import { TableStatus } from '../../src/common/enums/table-status.enum';
import { OrderItemStatus } from '../../src/common/enums/order-item-status.enum';

describe('Tables Overview WebSocket Integration', () => {
  let app: INestApplication;
  let tablesService: TablesService;
  let ordersService: OrdersService;
  let orderItemsService: OrderItemsService;
  let authService: AuthService;
  let usersService: UsersService;
  
  let adminSocket: typeof Socket;
  let waiterSocket: typeof Socket;
  let kitchenSocket: typeof Socket;
  
  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  
  let testTable: any;
  let testOrder: any;
  let testUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0); // Use random port for testing

    tablesService = moduleFixture.get<TablesService>(TablesService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);
    orderItemsService = moduleFixture.get<OrderItemsService>(OrderItemsService);
    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup sockets
    if (adminSocket) adminSocket.disconnect();
    if (waiterSocket) waiterSocket.disconnect();
    if (kitchenSocket) kitchenSocket.disconnect();
    
    await app.close();
  });

  beforeEach(async () => {
    // Setup WebSocket connections
    await setupWebSocketConnections();
  });

  afterEach(async () => {
    // Disconnect sockets after each test
    if (adminSocket) adminSocket.disconnect();
    if (waiterSocket) waiterSocket.disconnect();
    if (kitchenSocket) kitchenSocket.disconnect();
  });

  async function setupTestData() {
    // Create test users
    const adminUser = await usersService.create({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin Test',
      role: UserRole.ADMIN,
    });

    const waiterUser = await usersService.create({
      email: 'waiter@test.com',
      password: 'password123',
      name: 'Waiter Test',
      role: UserRole.WAITER,
    });

    const kitchenUser = await usersService.create({
      email: 'kitchen@test.com',
      password: 'password123',
      name: 'Kitchen Test',
      role: UserRole.KITCHEN,
    });

    // Generate tokens
    const adminAuth = await authService.login(adminUser);
    const waiterAuth = await authService.login(waiterUser);
    const kitchenAuth = await authService.login(kitchenUser);

    adminToken = adminAuth.accessToken;
    waiterToken = waiterAuth.accessToken;
    kitchenToken = kitchenAuth.accessToken;

    testUser = waiterUser;

    // Create test table
    testTable = await tablesService.create({
      number: 99,
      capacity: 4,
    });
  }

  async function setupWebSocketConnections() {
    const serverAddress = await app.getHttpServer().listen().address();
    const serverUrl = `http://localhost:${serverAddress.port}`;

    // Setup admin socket
    adminSocket = io(`${serverUrl}/orders`, {
      auth: { token: adminToken },
      transports: ['websocket'],
    });

    // Setup waiter socket
    waiterSocket = io(`${serverUrl}/orders`, {
      auth: { token: waiterToken },
      transports: ['websocket'],
    });

    // Setup kitchen socket
    kitchenSocket = io(`${serverUrl}/orders`, {
      auth: { token: kitchenToken },
      transports: ['websocket'],
    });

    // Wait for connections
    await Promise.all([
      new Promise((resolve) => adminSocket.on('connect', resolve)),
      new Promise((resolve) => waiterSocket.on('connect', resolve)),
      new Promise((resolve) => kitchenSocket.on('connect', resolve)),
    ]);

    // Join tables overview room
    adminSocket.emit('join-tables-overview');
    waiterSocket.emit('join-tables-overview');
    
    // Wait for room joins
    await Promise.all([
      new Promise((resolve) => adminSocket.on('joined-tables-overview', resolve)),
      new Promise((resolve) => waiterSocket.on('joined-tables-overview', resolve)),
    ]);
  }

  describe('Table Overview Real-time Updates', () => {
    it('should notify when table status changes', async () => {
      const tableStatusUpdates: any[] = [];
      const overviewUpdates: any[] = [];

      // Listen for events
      adminSocket.on('table-status-updated', (data) => {
        tableStatusUpdates.push(data);
      });

      adminSocket.on('tables-overview-update', (data) => {
        overviewUpdates.push(data);
      });

      // Change table status
      await tablesService.updateStatus(testTable.id, {
        status: TableStatus.CLEANING,
      });

      // Wait for notifications
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(tableStatusUpdates).toHaveLength(1);
      expect(tableStatusUpdates[0]).toMatchObject({
        tableId: testTable.id,
        tableNumber: testTable.number,
        status: TableStatus.CLEANING,
      });

      expect(overviewUpdates).toHaveLength(1);
      expect(overviewUpdates[0]).toHaveProperty('timestamp');
      expect(overviewUpdates[0]).toHaveProperty('message');
    });

    it('should notify when order is created for a table', async () => {
      const orderCreatedEvents: any[] = [];
      const tableOrderUpdates: any[] = [];
      const overviewUpdates: any[] = [];

      // Listen for events
      adminSocket.on('order-created', (data) => {
        orderCreatedEvents.push(data);
      });

      adminSocket.on('table-order-updated', (data) => {
        tableOrderUpdates.push(data);
      });

      adminSocket.on('tables-overview-update', (data) => {
        overviewUpdates.push(data);
      });

      // Create order for table
      testOrder = await ordersService.create(
        {
          tableId: testTable.id,
          items: [],
        },
        testUser.id,
      );

      // Wait for notifications
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(tableOrderUpdates).toHaveLength(1);
      expect(tableOrderUpdates[0]).toMatchObject({
        tableId: testTable.id,
        orderData: expect.objectContaining({
          orderId: testOrder.id,
          waiterName: testUser.name,
          status: 'open',
        }),
      });

      expect(overviewUpdates).toHaveLength(1);
    });

    it('should notify when order items status changes', async () => {
      // First create an order with items
      const menuItem = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Pizza',
          description: 'Test pizza for integration test',
          price: 25.99,
          category: 'Pizza',
          preparationTime: 15,
        })
        .expect(201);

      const orderWithItems = await ordersService.create(
        {
          tableId: testTable.id,
          items: [
            {
              menuItemId: menuItem.body.id,
              quantity: 2,
              specialInstructions: 'Extra cheese',
            },
          ],
        },
        testUser.id,
      );

      const orderItem = orderWithItems.items[0];

      const itemStatusUpdates: any[] = [];
      const tableOrderUpdates: any[] = [];

      // Listen for events
      adminSocket.on('order-item-status-updated', (data) => {
        itemStatusUpdates.push(data);
      });

      adminSocket.on('table-order-updated', (data) => {
        tableOrderUpdates.push(data);
      });

      // Update item status
      await orderItemsService.updateStatus(orderItem.id, {
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: testUser.id,
      });

      // Wait for notifications
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(itemStatusUpdates).toHaveLength(1);
      expect(itemStatusUpdates[0]).toMatchObject({
        orderItemId: orderItem.id,
        status: OrderItemStatus.IN_PREPARATION,
        updatedBy: testUser.name,
      });

      expect(tableOrderUpdates).toHaveLength(1);
      expect(tableOrderUpdates[0]).toMatchObject({
        tableId: testTable.id,
        orderData: expect.objectContaining({
          itemStatusUpdate: expect.objectContaining({
            itemId: orderItem.id,
            newStatus: OrderItemStatus.IN_PREPARATION,
          }),
        }),
      });
    });

    it('should notify when order is closed', async () => {
      // Create and close an order
      const order = await ordersService.create(
        {
          tableId: testTable.id,
          items: [],
        },
        testUser.id,
      );

      const orderClosedEvents: any[] = [];
      const tableOrderUpdates: any[] = [];

      // Listen for events
      adminSocket.on('order-closed', (data) => {
        orderClosedEvents.push(data);
      });

      adminSocket.on('table-order-updated', (data) => {
        tableOrderUpdates.push(data);
      });

      // Close the order
      await ordersService.closeOrder(order.id);

      // Wait for notifications
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(orderClosedEvents).toHaveLength(1);
      expect(orderClosedEvents[0]).toMatchObject({
        orderId: order.id,
        tableNumber: testTable.number,
      });

      expect(tableOrderUpdates).toHaveLength(1);
      expect(tableOrderUpdates[0]).toMatchObject({
        tableId: testTable.id,
        orderData: expect.objectContaining({
          orderId: null, // Table freed
          status: 'closed',
        }),
      });
    });

    it('should handle tables overview data requests', async () => {
      const overviewDataEvents: any[] = [];

      // Listen for overview data
      adminSocket.on('tables-overview-data', (data) => {
        overviewDataEvents.push(data);
      });

      // Request tables overview
      adminSocket.emit('request-tables-overview', {
        filters: {
          sortBy: 'number',
          sortOrder: 'ASC',
        },
      });

      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(overviewDataEvents).toHaveLength(1);
      expect(overviewDataEvents[0]).toHaveProperty('tables');
      expect(overviewDataEvents[0]).toHaveProperty('timestamp');
      expect(overviewDataEvents[0]).toHaveProperty('filters');
      expect(Array.isArray(overviewDataEvents[0].tables)).toBe(true);
    });
  });

  describe('REST API Integration', () => {
    it('should return tables overview via REST endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/tables/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          sortBy: 'number',
          sortOrder: 'ASC',
          includeOrderDetails: 'true',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should include our test table
      const testTableInResponse = response.body.find(
        (table: any) => table.id === testTable.id,
      );
      
      expect(testTableInResponse).toBeDefined();
      expect(testTableInResponse).toMatchObject({
        id: testTable.id,
        number: testTable.number,
        capacity: testTable.capacity,
        status: expect.any(String),
        hasPendingOrders: expect.any(Boolean),
        priority: expect.stringMatching(/^(low|medium|high)$/),
      });
    });

    it('should filter tables overview by status', async () => {
      // Set table to occupied
      await tablesService.updateStatus(testTable.id, {
        status: TableStatus.OCCUPIED,
      });

      const response = await request(app.getHttpServer())
        .get('/tables/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          status: TableStatus.OCCUPIED,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All returned tables should be occupied
      response.body.forEach((table: any) => {
        expect(table.status).toBe(TableStatus.OCCUPIED);
      });
    });

    it('should filter tables by pending orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/tables/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          hasPendingOrders: 'true',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All returned tables should have pending orders
      response.body.forEach((table: any) => {
        expect(table.hasPendingOrders).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket authentication errors', async () => {
      const invalidSocket = io(`http://localhost:${app.getHttpServer().address().port}/orders`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      const connectErrors: any[] = [];
      invalidSocket.on('connect_error', (error) => {
        connectErrors.push(error);
      });

      // Wait for connection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(connectErrors.length).toBeGreaterThan(0);
      
      invalidSocket.disconnect();
    });

    it('should handle REST API authentication errors', async () => {
      await request(app.getHttpServer())
        .get('/tables/overview')
        .expect(401);

      await request(app.getHttpServer())
        .get('/tables/overview')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});