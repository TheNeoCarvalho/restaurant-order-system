import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { TablesService } from '../../src/tables/tables.service';
import { MenuService } from '../../src/menu/menu.service';
import { OrdersService } from '../../src/orders/orders.service';
import { UserRole } from '../../src/users/enums/user-role.enum';
import { OrderItemStatus } from '../../src/common/enums/order-item-status.enum';

describe('Order Items REST API Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;
  let tablesService: TablesService;
  let menuService: MenuService;
  let ordersService: OrdersService;

  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let testUsers: any;
  let testTable: any;
  let testMenuItem: any;
  let testOrder: any;
  let testOrderItem: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    tablesService = moduleFixture.get<TablesService>(TablesService);
    menuService = moduleFixture.get<MenuService>(MenuService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);

    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create test users
    const adminUser = await usersService.create({
      email: 'admin-orderitems@test.com',
      password: 'password123',
      name: 'Admin Order Items Test',
      role: UserRole.ADMIN,
    });

    const waiterUser = await usersService.create({
      email: 'waiter-orderitems@test.com',
      password: 'password123',
      name: 'Waiter Order Items Test',
      role: UserRole.WAITER,
    });

    const kitchenUser = await usersService.create({
      email: 'kitchen-orderitems@test.com',
      password: 'password123',
      name: 'Kitchen Order Items Test',
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
      number: 500,
      capacity: 4,
    });

    // Create test menu item
    testMenuItem = await menuService.create({
      name: 'Order Items Test Pizza',
      description: 'Test pizza for order items tests',
      price: 28.99,
      category: 'Pizzas',
      preparationTime: 18,
    });
  }

  beforeEach(async () => {
    // Create fresh order and order item for each test
    testOrder = await ordersService.create(
      {
        tableId: testTable.id,
        items: [
          {
            menuItemId: testMenuItem.id,
            quantity: 2,
            specialInstructions: 'Extra cheese',
          },
        ],
      },
      testUsers.waiterUser.id,
    );
    testOrderItem = testOrder.items[0];
  });

  describe('GET /order-items', () => {
    it('should return all order items for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const orderItem = response.body.find((item: any) => item.id === testOrderItem.id);
      expect(orderItem).toBeDefined();
      expect(orderItem).toMatchObject({
        id: testOrderItem.id,
        quantity: 2,
        specialInstructions: 'Extra cheese',
        status: OrderItemStatus.PENDING,
        menuItem: expect.objectContaining({
          name: testMenuItem.name,
        }),
      });
    });

    it('should return order items for waiter', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return order items for kitchen', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/order-items')
        .expect(401);
    });
  });

  describe('GET /order-items/pending', () => {
    it('should return only pending order items', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items/pending')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All items should be pending
      response.body.forEach((item: any) => {
        expect(item.status).toBe(OrderItemStatus.PENDING);
      });

      // Should include our test item
      const testItem = response.body.find((item: any) => item.id === testOrderItem.id);
      expect(testItem).toBeDefined();
    });
  });

  describe('GET /order-items/kitchen', () => {
    it('should return kitchen view of order items', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items/kitchen')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      const testItem = response.body.find((item: any) => item.id === testOrderItem.id);
      expect(testItem).toMatchObject({
        id: testOrderItem.id,
        quantity: 2,
        specialInstructions: 'Extra cheese',
        status: OrderItemStatus.PENDING,
        menuItem: expect.objectContaining({
          name: testMenuItem.name,
          preparationTime: testMenuItem.preparationTime,
        }),
        order: expect.objectContaining({
          table: expect.objectContaining({
            number: testTable.number,
          }),
          waiter: expect.objectContaining({
            name: testUsers.waiterUser.name,
          }),
        }),
      });
    });

    it('should allow admin to access kitchen view', async () => {
      await request(app.getHttpServer())
        .get('/order-items/kitchen')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow waiter to access kitchen view', async () => {
      await request(app.getHttpServer())
        .get('/order-items/kitchen')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);
    });
  });

  describe('GET /order-items/:id', () => {
    it('should return specific order item', async () => {
      const response = await request(app.getHttpServer())
        .get(`/order-items/${testOrderItem.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testOrderItem.id,
        quantity: 2,
        specialInstructions: 'Extra cheese',
        status: OrderItemStatus.PENDING,
        menuItem: expect.objectContaining({
          name: testMenuItem.name,
        }),
        order: expect.objectContaining({
          id: testOrder.id,
        }),
      });
    });

    it('should return 404 for non-existent order item', async () => {
      await request(app.getHttpServer())
        .get('/order-items/non-existent-id')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(404);
    });
  });

  describe('PATCH /order-items/:id/status', () => {
    it('should allow kitchen user to update status to IN_PREPARATION', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.IN_PREPARATION,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testOrderItem.id,
        status: OrderItemStatus.IN_PREPARATION,
        statusUpdatedBy: expect.objectContaining({
          id: testUsers.kitchenUser.id,
          name: testUsers.kitchenUser.name,
        }),
        updatedAt: expect.any(String),
      });
    });

    it('should allow kitchen user to update status to READY', async () => {
      // First set to IN_PREPARATION
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.IN_PREPARATION,
        });

      // Then set to READY
      const response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.READY,
        })
        .expect(200);

      expect(response.body.status).toBe(OrderItemStatus.READY);
    });

    it('should allow waiter to update status to DELIVERED', async () => {
      // First set to READY
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.READY,
        });

      // Then waiter can set to DELIVERED
      const response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: OrderItemStatus.DELIVERED,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testOrderItem.id,
        status: OrderItemStatus.DELIVERED,
        statusUpdatedBy: expect.objectContaining({
          id: testUsers.waiterUser.id,
        }),
      });
    });

    it('should allow admin to update to any status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: OrderItemStatus.CANCELLED,
        })
        .expect(200);

      expect(response.body.status).toBe(OrderItemStatus.CANCELLED);
    });

    it('should return 400 with invalid status', async () => {
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);
    });

    it('should return 403 when waiter tries to set kitchen statuses', async () => {
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: OrderItemStatus.IN_PREPARATION,
        })
        .expect(403);
    });

    it('should return 403 when kitchen tries to set DELIVERED status', async () => {
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.DELIVERED,
        })
        .expect(403);
    });

    it('should validate status transition logic', async () => {
      // Try to go directly from PENDING to DELIVERED (should fail)
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: OrderItemStatus.DELIVERED,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('transição inválida');
        });
    });
  });

  describe('GET /order-items/status/:status', () => {
    beforeEach(async () => {
      // Create items with different statuses
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.IN_PREPARATION,
        });
    });

    it('should return items by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/order-items/status/${OrderItemStatus.IN_PREPARATION}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All items should have the requested status
      response.body.forEach((item: any) => {
        expect(item.status).toBe(OrderItemStatus.IN_PREPARATION);
      });

      // Should include our test item
      const testItem = response.body.find((item: any) => item.id === testOrderItem.id);
      expect(testItem).toBeDefined();
    });

    it('should return empty array for status with no items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/order-items/status/${OrderItemStatus.CANCELLED}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /order-items/order/:orderId', () => {
    it('should return all items for specific order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/order-items/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // All items should belong to the specified order
      response.body.forEach((item: any) => {
        expect(item.order.id).toBe(testOrder.id);
      });

      // Should include our test item
      const testItem = response.body.find((item: any) => item.id === testOrderItem.id);
      expect(testItem).toBeDefined();
    });

    it('should return empty array for order with no items', async () => {
      // Create order without items
      const emptyOrder = await ordersService.create(
        {
          tableId: testTable.id,
          items: [],
        },
        testUsers.waiterUser.id,
      );

      const response = await request(app.getHttpServer())
        .get(`/order-items/order/${emptyOrder.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/order-items/order/non-existent-id')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(404);
    });
  });

  describe('GET /order-items/table/:tableId', () => {
    it('should return all items for specific table', async () => {
      const response = await request(app.getHttpServer())
        .get(`/order-items/table/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // All items should belong to orders for the specified table
      response.body.forEach((item: any) => {
        expect(item.order.table.id).toBe(testTable.id);
      });

      // Should include our test item
      const testItem = response.body.find((item: any) => item.id === testOrderItem.id);
      expect(testItem).toBeDefined();
    });

    it('should return empty array for table with no orders', async () => {
      // Create another table
      const emptyTable = await tablesService.create({
        number: 501,
        capacity: 2,
      });

      const response = await request(app.getHttpServer())
        .get(`/order-items/table/${emptyTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('Status Workflow Integration', () => {
    it('should complete full workflow from pending to delivered', async () => {
      // 1. Start as PENDING
      let response = await request(app.getHttpServer())
        .get(`/order-items/${testOrderItem.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);
      expect(response.body.status).toBe(OrderItemStatus.PENDING);

      // 2. Kitchen sets to IN_PREPARATION
      response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.IN_PREPARATION,
        })
        .expect(200);
      expect(response.body.status).toBe(OrderItemStatus.IN_PREPARATION);

      // 3. Kitchen sets to READY
      response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.READY,
        })
        .expect(200);
      expect(response.body.status).toBe(OrderItemStatus.READY);

      // 4. Waiter sets to DELIVERED
      response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: OrderItemStatus.DELIVERED,
        })
        .expect(200);
      expect(response.body.status).toBe(OrderItemStatus.DELIVERED);

      // Verify final state
      response = await request(app.getHttpServer())
        .get(`/order-items/${testOrderItem.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: OrderItemStatus.DELIVERED,
        statusUpdatedBy: expect.objectContaining({
          name: testUsers.waiterUser.name,
        }),
        updatedAt: expect.any(String),
      });
    });

    it('should handle cancellation at any stage', async () => {
      // Set to IN_PREPARATION first
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          status: OrderItemStatus.IN_PREPARATION,
        });

      // Admin can cancel at any stage
      const response = await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItem.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: OrderItemStatus.CANCELLED,
        })
        .expect(200);

      expect(response.body.status).toBe(OrderItemStatus.CANCELLED);
    });
  });

  describe('Performance and Filtering', () => {
    it('should handle filtering by multiple criteria', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          status: OrderItemStatus.PENDING,
          tableId: testTable.id,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All items should match the filters
      response.body.forEach((item: any) => {
        expect(item.status).toBe(OrderItemStatus.PENDING);
        expect(item.order.table.id).toBe(testTable.id);
      });
    });

    it('should handle pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });
  });
});