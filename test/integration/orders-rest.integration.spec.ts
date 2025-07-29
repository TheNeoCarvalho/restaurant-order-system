import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { TablesService } from '../../src/tables/tables.service';
import { MenuService } from '../../src/menu/menu.service';
import { UserRole } from '../../src/users/enums/user-role.enum';
import { TableStatus } from '../../src/common/enums/table-status.enum';

describe('Orders REST API Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;
  let tablesService: TablesService;
  let menuService: MenuService;

  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let testTable: any;
  let testMenuItem: any;
  let testUser: any;

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

    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create test users
    const adminUser = await usersService.create({
      email: 'admin-orders@test.com',
      password: 'password123',
      name: 'Admin Orders Test',
      role: UserRole.ADMIN,
    });

    const waiterUser = await usersService.create({
      email: 'waiter-orders@test.com',
      password: 'password123',
      name: 'Waiter Orders Test',
      role: UserRole.WAITER,
    });

    const kitchenUser = await usersService.create({
      email: 'kitchen-orders@test.com',
      password: 'password123',
      name: 'Kitchen Orders Test',
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
      number: 100,
      capacity: 4,
    });

    // Create test menu item
    testMenuItem = await menuService.create({
      name: 'Test Burger Integration',
      description: 'Test burger for integration tests',
      price: 19.99,
      category: 'Burgers',
      preparationTime: 10,
    });
  }

  describe('POST /orders', () => {
    it('should create a new order successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 2,
              specialInstructions: 'No onions',
            },
          ],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        tableId: testTable.id,
        status: 'open',
        totalAmount: expect.any(Number),
        items: expect.arrayContaining([
          expect.objectContaining({
            menuItemId: testMenuItem.id,
            quantity: 2,
            specialInstructions: 'No onions',
            status: 'pending',
          }),
        ]),
      });

      expect(response.body.totalAmount).toBe(39.98); // 2 * 19.99
    });

    it('should return 400 when table is already occupied', async () => {
      // First order
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        })
        .expect(201);

      // Second order for same table should fail
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('já está ocupada');
        });
    });

    it('should return 404 when table does not exist', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: 99999,
          items: [],
        })
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          tableId: testTable.id,
          items: [],
        })
        .expect(401);
    });

    it('should return 403 when kitchen user tries to create order', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        })
        .expect(403);
    });
  });

  describe('GET /orders', () => {
    let testOrder: any;

    beforeEach(async () => {
      // Create a test order
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        });
      testOrder = response.body;
    });

    it('should return all orders for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const order = response.body.find((o: any) => o.id === testOrder.id);
      expect(order).toBeDefined();
    });

    it('should return orders for waiter', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 for kitchen user', async () => {
      await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(403);
    });
  });

  describe('GET /orders/:id', () => {
    let testOrder: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 1,
            },
          ],
        });
      testOrder = response.body;
    });

    it('should return specific order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testOrder.id,
        tableId: testTable.id,
        status: 'open',
        items: expect.any(Array),
      });
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/orders/non-existent-id')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(404);
    });
  });

  describe('POST /orders/:id/items', () => {
    let testOrder: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        });
      testOrder = response.body;
    });

    it('should add item to order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/orders/${testOrder.id}/items`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          menuItemId: testMenuItem.id,
          quantity: 3,
          specialInstructions: 'Extra sauce',
        })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        menuItemId: testMenuItem.id,
        quantity: 3,
        specialInstructions: 'Extra sauce',
        status: 'pending',
      });

      expect(response.body.totalAmount).toBe(59.97); // 3 * 19.99
    });

    it('should return 400 when menu item is not available', async () => {
      // Disable the menu item
      await menuService.toggleAvailability(testMenuItem.id, testUser.id);

      await request(app.getHttpServer())
        .post(`/orders/${testOrder.id}/items`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          menuItemId: testMenuItem.id,
          quantity: 1,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('não está disponível');
        });
    });
  });

  describe('POST /orders/:id/close', () => {
    let testOrder: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        });
      testOrder = response.body;
    });

    it('should close order successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/orders/${testOrder.id}/close`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body.order).toMatchObject({
        id: testOrder.id,
        status: 'closed',
        closedAt: expect.any(String),
      });

      expect(response.body.summary).toMatchObject({
        orderId: testOrder.id,
        tableNumber: testTable.number,
        totals: expect.objectContaining({
          subtotal: expect.any(Number),
          serviceCharge: expect.any(Number),
          taxAmount: expect.any(Number),
          finalTotal: expect.any(Number),
        }),
      });
    });

    it('should return 403 when kitchen user tries to close order', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${testOrder.id}/close`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(403);
    });
  });

  describe('GET /orders/table/:tableId', () => {
    let testOrder: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [],
        });
      testOrder = response.body;
    });

    it('should return orders for specific table', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/table/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const order = response.body.find((o: any) => o.id === testOrder.id);
      expect(order).toBeDefined();
      expect(order.tableId).toBe(testTable.id);
    });

    it('should return empty array for table with no orders', async () => {
      // Create another table
      const anotherTable = await tablesService.create({
        number: 101,
        capacity: 2,
      });

      const response = await request(app.getHttpServer())
        .get(`/orders/table/${anotherTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });
});