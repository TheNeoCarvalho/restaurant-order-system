import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
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

describe('User Roles E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let adminUser: User;
  let waiterUser: User;
  let kitchenUser: User;
  let testTable: Table;
  let testMenuItem: MenuItem;

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
    
    // Reset table status
    await dataSource.getRepository(Table).update(
      { id: testTable.id },
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
      email: 'admin-roles@test.com',
      password: hashedPassword,
      name: 'Admin Roles Test',
      role: UserRole.ADMIN,
      isActive: true,
    });

    waiterUser = await userRepository.save({
      email: 'waiter-roles@test.com',
      password: hashedPassword,
      name: 'Waiter Roles Test',
      role: UserRole.WAITER,
      isActive: true,
    });

    kitchenUser = await userRepository.save({
      email: 'kitchen-roles@test.com',
      password: hashedPassword,
      name: 'Kitchen Roles Test',
      role: UserRole.KITCHEN,
      isActive: true,
    });

    // Create test table
    testTable = await tableRepository.save({
      number: 88,
      capacity: 4,
      status: TableStatus.AVAILABLE,
    });

    // Create test menu item
    testMenuItem = await menuItemRepository.save({
      name: 'Role Test Item',
      description: 'Item for role testing',
      price: 15.99,
      category: 'Test Category',
      isAvailable: true,
      preparationTime: 10,
    });

    // Get authentication tokens
    adminToken = await getAuthToken('admin-roles@test.com', 'password123');
    waiterToken = await getAuthToken('waiter-roles@test.com', 'password123');
    kitchenToken = await getAuthToken('kitchen-roles@test.com', 'password123');
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

  async function createTestOrder(token: string): Promise<any> {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableId: testTable.id,
        items: [
          {
            menuItemId: testMenuItem.id,
            quantity: 1,
          },
        ],
      });

    return response.body;
  }

  describe('Admin Role Permissions', () => {
    it('should allow admin to create and manage orders', async () => {
      // Admin can create orders
      const order = await createTestOrder(adminToken);
      expect(order.id).toBeDefined();

      // Admin can view orders
      await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin can update order item status
      const orderItemId = order.items[0].id;
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      // Admin can close orders
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/orders/${order.id}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admin to manage menu items', async () => {
      // Admin can create menu items
      const createResponse = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Created Item',
          description: 'Created by admin user',
          price: 12.99,
          category: 'Admin Category',
          isAvailable: true,
          preparationTime: 8,
        })
        .expect(201);

      const menuItemId = createResponse.body.id;

      // Admin can update menu items
      await request(app.getHttpServer())
        .patch(`/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Admin Item',
          price: 14.99,
        })
        .expect(200);

      // Admin can delete menu items
      await request(app.getHttpServer())
        .delete(`/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admin to manage tables', async () => {
      // Admin can create tables
      const createResponse = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 77,
          capacity: 6,
        })
        .expect(201);

      const tableId = createResponse.body.id;

      // Admin can update tables
      await request(app.getHttpServer())
        .patch(`/tables/${tableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          capacity: 8,
          status: TableStatus.CLEANING,
        })
        .expect(200);

      // Admin can view all tables
      const tablesResponse = await request(app.getHttpServer())
        .get('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(tablesResponse.body).toBeInstanceOf(Array);
      expect(tablesResponse.body.length).toBeGreaterThan(0);

      // Clean up
      await request(app.getHttpServer())
        .delete(`/tables/${tableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admin to view all orders and statistics', async () => {
      // Create multiple orders
      const order1 = await createTestOrder(adminToken);
      
      // Reset table for second order
      await dataSource.getRepository(Table).update(
        { id: testTable.id },
        { status: TableStatus.AVAILABLE }
      );
      
      const order2 = await createTestOrder(adminToken);

      // Admin can view all orders
      const ordersResponse = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(ordersResponse.body).toBeInstanceOf(Array);
      expect(ordersResponse.body.length).toBeGreaterThanOrEqual(2);

      // Admin can view tables overview
      const overviewResponse = await request(app.getHttpServer())
        .get('/tables/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(overviewResponse.body).toBeInstanceOf(Array);
    });
  });

  describe('Waiter Role Permissions', () => {
    it('should allow waiter to create and manage orders', async () => {
      // Waiter can create orders
      const order = await createTestOrder(waiterToken);
      expect(order.id).toBeDefined();

      // Waiter can view their orders
      await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      // Waiter can mark items as delivered
      const orderItemId = order.items[0].id;
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // Waiter can close orders
      await request(app.getHttpServer())
        .post(`/orders/${order.id}/close`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);
    });

    it('should allow waiter to add items to existing orders', async () => {
      // Create initial order
      const order = await createTestOrder(waiterToken);

      // Waiter can add items to order
      await request(app.getHttpServer())
        .post(`/orders/${order.id}/items`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          menuItemId: testMenuItem.id,
          quantity: 2,
          specialInstructions: 'Extra sauce',
        })
        .expect(201);

      // Verify items were added
      const updatedOrderResponse = await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(updatedOrderResponse.body.items.length).toBe(2);
    });

    it('should restrict waiter from menu management', async () => {
      // Waiter cannot create menu items
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Waiter Item',
          description: 'Should not be created',
          price: 10.99,
          category: 'Forbidden',
        })
        .expect(403);

      // Waiter cannot update menu items
      await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Updated by waiter',
        })
        .expect(403);

      // Waiter cannot delete menu items
      await request(app.getHttpServer())
        .delete(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(403);
    });

    it('should allow waiter to view tables and their status', async () => {
      // Waiter can view all tables
      const tablesResponse = await request(app.getHttpServer())
        .get('/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(tablesResponse.body).toBeInstanceOf(Array);

      // Waiter can view specific table
      await request(app.getHttpServer())
        .get(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      // Waiter can view tables overview
      await request(app.getHttpServer())
        .get('/tables/overview')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);
    });

    it('should restrict waiter from table management', async () => {
      // Waiter cannot create tables
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          number: 66,
          capacity: 4,
        })
        .expect(403);

      // Waiter cannot update table properties (except through orders)
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          capacity: 6,
        })
        .expect(403);

      // Waiter cannot delete tables
      await request(app.getHttpServer())
        .delete(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(403);
    });
  });

  describe('Kitchen Role Permissions', () => {
    let testOrder: any;
    let testOrderItemId: string;

    beforeEach(async () => {
      // Create order as waiter for kitchen to work with
      testOrder = await createTestOrder(waiterToken);
      testOrderItemId = testOrder.items[0].id;
    });

    it('should allow kitchen to view and update order item status', async () => {
      // Kitchen can view orders (to see what to prepare)
      await request(app.getHttpServer())
        .get(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      // Kitchen can update item status to IN_PREPARATION
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      // Kitchen can update item status to READY
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);

      // Kitchen can cancel items if needed
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.CANCELLED })
        .expect(200);
    });

    it('should restrict kitchen from creating orders', async () => {
      // Kitchen cannot create orders
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 1,
            },
          ],
        })
        .expect(403);
    });

    it('should restrict kitchen from closing orders', async () => {
      // Mark item as delivered first (as waiter)
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // Kitchen cannot close orders
      await request(app.getHttpServer())
        .post(`/orders/${testOrder.id}/close`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(403);
    });

    it('should restrict kitchen from menu management', async () => {
      // Kitchen cannot create menu items
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          name: 'Kitchen Item',
          description: 'Should not be created',
          price: 8.99,
          category: 'Kitchen',
        })
        .expect(403);

      // Kitchen cannot update menu items
      await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          name: 'Updated by kitchen',
        })
        .expect(403);

      // Kitchen cannot delete menu items
      await request(app.getHttpServer())
        .delete(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(403);
    });

    it('should restrict kitchen from table management', async () => {
      // Kitchen cannot create tables
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          number: 55,
          capacity: 4,
        })
        .expect(403);

      // Kitchen cannot update tables
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          capacity: 6,
        })
        .expect(403);

      // Kitchen cannot delete tables
      await request(app.getHttpServer())
        .delete(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(403);
    });

    it('should allow kitchen to view menu items (read-only)', async () => {
      // Kitchen can view menu items to know what they can prepare
      const menuResponse = await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(menuResponse.body).toBeInstanceOf(Array);

      // Kitchen can view specific menu item
      await request(app.getHttpServer())
        .get(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);
    });

    it('should restrict kitchen from marking items as delivered', async () => {
      // Kitchen can prepare items
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);

      // Kitchen cannot mark items as delivered (that's waiter's job)
      await request(app.getHttpServer())
        .patch(`/order-items/${testOrderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(403);
    });
  });

  describe('Cross-Role Interactions', () => {
    it('should handle complete workflow with different roles', async () => {
      // 1. Waiter creates order
      const order = await createTestOrder(waiterToken);
      const orderItemId = order.items[0].id;

      // 2. Kitchen starts preparation
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      // 3. Kitchen marks as ready
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);

      // 4. Waiter delivers item
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // 5. Admin can close order (or waiter)
      await request(app.getHttpServer())
        .post(`/orders/${order.id}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify final state
      const finalOrderResponse = await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(finalOrderResponse.body.status).toBe('closed');
      expect(finalOrderResponse.body.items[0].status).toBe(OrderItemStatus.DELIVERED);
    });

    it('should prevent unauthorized status transitions between roles', async () => {
      const order = await createTestOrder(waiterToken);
      const orderItemId = order.items[0].id;

      // Kitchen starts preparation
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      // Waiter cannot change status back to pending
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.PENDING })
        .expect(400);

      // Kitchen cannot skip to delivered
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(403);
    });

    it('should allow admin to override any status transition', async () => {
      const order = await createTestOrder(waiterToken);
      const orderItemId = order.items[0].id;

      // Admin can make any status transition
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // Admin can even revert status if needed
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);
    });
  });

  describe('Authentication and Authorization Edge Cases', () => {
    it('should handle expired tokens properly', async () => {
      // This would require creating an expired token
      // For now, we test with invalid token
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer expired-or-invalid-token')
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 1,
            },
          ],
        })
        .expect(401);
    });

    it('should handle inactive users properly', async () => {
      // Deactivate waiter user
      await dataSource.getRepository(User).update(
        { id: waiterUser.id },
        { isActive: false }
      );

      // Should not be able to use token of inactive user
      await request(app.getHttpServer())
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
        })
        .expect(401);

      // Reactivate for cleanup
      await dataSource.getRepository(User).update(
        { id: waiterUser.id },
        { isActive: true }
      );
    });

    it('should handle role changes properly', async () => {
      // Change waiter to kitchen role
      await dataSource.getRepository(User).update(
        { id: waiterUser.id },
        { role: UserRole.KITCHEN }
      );

      // Old token should still work but with new permissions
      // Kitchen cannot create orders
      await request(app.getHttpServer())
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
        })
        .expect(403);

      // Restore original role
      await dataSource.getRepository(User).update(
        { id: waiterUser.id },
        { role: UserRole.WAITER }
      );
    });
  });
});