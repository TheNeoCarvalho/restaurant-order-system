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
import { OrderStatus } from '../src/common/enums/order-status.enum';
import { OrderItemStatus } from '../src/common/enums/order-item-status.enum';
import * as bcrypt from 'bcryptjs';

describe('Order Flow E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let adminUser: User;
  let waiterUser: User;
  let kitchenUser: User;
  let testTable: Table;
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
    
    // Setup test data
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
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin Test',
      role: UserRole.ADMIN,
      isActive: true,
    });

    waiterUser = await userRepository.save({
      email: 'waiter@test.com',
      password: hashedPassword,
      name: 'Waiter Test',
      role: UserRole.WAITER,
      isActive: true,
    });

    kitchenUser = await userRepository.save({
      email: 'kitchen@test.com',
      password: hashedPassword,
      name: 'Kitchen Test',
      role: UserRole.KITCHEN,
      isActive: true,
    });

    // Create test table
    testTable = await tableRepository.save({
      number: 99,
      capacity: 4,
      status: TableStatus.AVAILABLE,
    });

    // Create test menu items
    testMenuItem1 = await menuItemRepository.save({
      name: 'Test Pizza',
      description: 'Delicious test pizza',
      price: 25.99,
      category: 'Main Course',
      isAvailable: true,
      preparationTime: 15,
    });

    testMenuItem2 = await menuItemRepository.save({
      name: 'Test Drink',
      description: 'Refreshing test drink',
      price: 5.99,
      category: 'Beverages',
      isAvailable: true,
      preparationTime: 2,
    });

    // Get authentication tokens
    adminToken = await getAuthToken('admin@test.com', 'password123');
    waiterToken = await getAuthToken('waiter@test.com', 'password123');
    kitchenToken = await getAuthToken('kitchen@test.com', 'password123');
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
      });

      client.on('connect', () => resolve(client));
      client.on('connect_error', reject);
      
      setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
    });
  }

  describe('Complete Order Creation and Closure Flow', () => {
    it('should create, manage, and close an order successfully', async () => {
      // Step 1: Waiter creates a new order
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 2,
              specialInstructions: 'Extra cheese',
            },
            {
              menuItemId: testMenuItem2.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const createdOrder = createOrderResponse.body;
      expect(createdOrder.id).toBeDefined();
      expect(createdOrder.tableId).toBe(testTable.id);
      expect(createdOrder.status).toBe(OrderStatus.OPEN);
      expect(createdOrder.items).toHaveLength(2);
      expect(createdOrder.totalAmount).toBe('57.97'); // 2 * 25.99 + 1 * 5.99

      // Verify table status changed to occupied
      const tableResponse = await request(app.getHttpServer())
        .get(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(tableResponse.body.status).toBe(TableStatus.OCCUPIED);

      // Step 2: Kitchen updates item status to IN_PREPARATION
      const orderItems = createdOrder.items;
      const pizzaItem = orderItems.find(item => item.menuItem.name === 'Test Pizza');
      
      await request(app.getHttpServer())
        .patch(`/order-items/${pizzaItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      // Step 3: Kitchen marks item as READY
      await request(app.getHttpServer())
        .patch(`/order-items/${pizzaItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);

      // Step 4: Waiter marks item as DELIVERED
      await request(app.getHttpServer())
        .patch(`/order-items/${pizzaItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // Step 5: Mark drink as delivered (simplified flow)
      const drinkItem = orderItems.find(item => item.menuItem.name === 'Test Drink');
      
      await request(app.getHttpServer())
        .patch(`/order-items/${drinkItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/order-items/${drinkItem.id}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/order-items/${drinkItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // Step 6: Waiter closes the order
      const closeOrderResponse = await request(app.getHttpServer())
        .post(`/orders/${createdOrder.id}/close`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(closeOrderResponse.body.status).toBe(OrderStatus.CLOSED);
      expect(closeOrderResponse.body.closedAt).toBeDefined();
      expect(closeOrderResponse.body.totalAmount).toBe('57.97');

      // Verify table is available again
      const finalTableResponse = await request(app.getHttpServer())
        .get(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(finalTableResponse.body.status).toBe(TableStatus.AVAILABLE);
    });

    it('should handle order cancellation properly', async () => {
      // Create order
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const createdOrder = createOrderResponse.body;
      const orderItem = createdOrder.items[0];

      // Cancel the order item
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItem.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.CANCELLED })
        .expect(200);

      // Verify item status
      const orderResponse = await request(app.getHttpServer())
        .get(`/orders/${createdOrder.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(orderResponse.body.items[0].status).toBe(OrderItemStatus.CANCELLED);

      // Should still be able to close the order
      await request(app.getHttpServer())
        .post(`/orders/${createdOrder.id}/close`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);
    });
  });

  describe('Different User Role Tests', () => {
    it('should allow admin to perform all operations', async () => {
      // Admin can create orders
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;
      const orderItemId = createOrderResponse.body.items[0].id;

      // Admin can update order item status
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      // Admin can close orders
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin can manage menu items
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Test Item',
          description: 'Created by admin',
          price: 10.99,
          category: 'Test',
          isAvailable: true,
          preparationTime: 5,
        })
        .expect(201);
    });

    it('should restrict waiter permissions appropriately', async () => {
      // Waiter can create orders
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderItemId = createOrderResponse.body.items[0].id;

      // Waiter can mark items as delivered
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(200);

      // Waiter cannot create menu items
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Waiter Test Item',
          description: 'Should not be created',
          price: 10.99,
          category: 'Test',
        })
        .expect(403);
    });

    it('should restrict kitchen permissions appropriately', async () => {
      // Kitchen cannot create orders
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(403);

      // Create order as waiter first
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;
      const orderItemId = createOrderResponse.body.items[0].id;

      // Kitchen can update order item status to preparation states
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.IN_PREPARATION })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderItemStatus.READY })
        .expect(200);

      // Kitchen cannot close orders
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/close`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(403);

      // Kitchen cannot create menu items
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          name: 'Kitchen Test Item',
          description: 'Should not be created',
          price: 10.99,
          category: 'Test',
        })
        .expect(403);
    });
  });

  describe('Real-time WebSocket Synchronization Tests', () => {
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
      let notificationReceived = false;

      // Kitchen listens for new orders
      kitchenSocket.on('order-created', (data) => {
        expect(data.orderId).toBeDefined();
        expect(data.tableNumber).toBe(testTable.number);
        expect(data.items).toHaveLength(1);
        expect(data.items[0].menuItemName).toBe('Test Pizza');
        expect(data.items[0].quantity).toBe(2);
        expect(data.items[0].specialInstructions).toBe('Extra cheese');
        notificationReceived = true;
      });

      // Admin also receives notifications
      adminSocket.on('order-created', (data) => {
        expect(data.orderId).toBeDefined();
        if (notificationReceived) {
          done();
        }
      });

      // Waiter creates order
      setTimeout(async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [
              {
                menuItemId: testMenuItem1.id,
                quantity: 2,
                specialInstructions: 'Extra cheese',
              },
            ],
          })
          .expect(201);
      }, 100);
    });

    it('should notify waiter when order item status changes', (done) => {
      let orderId: string;
      let orderItemId: string;

      // Waiter listens for status updates
      waiterSocket.on('order-item-status-updated', (data) => {
        expect(data.orderItemId).toBe(orderItemId);
        expect(data.status).toBe(OrderItemStatus.IN_PREPARATION);
        expect(data.updatedBy).toBe('Kitchen Test');
        done();
      });

      // Create order first
      setTimeout(async () => {
        const createOrderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [
              {
                menuItemId: testMenuItem1.id,
                quantity: 1,
              },
            ],
          });

        orderId = createOrderResponse.body.id;
        orderItemId = createOrderResponse.body.items[0].id;

        // Kitchen updates status
        setTimeout(async () => {
          await request(app.getHttpServer())
            .patch(`/order-items/${orderItemId}/status`)
            .set('Authorization', `Bearer ${kitchenToken}`)
            .send({ status: OrderItemStatus.IN_PREPARATION });
        }, 100);
      }, 100);
    });

    it('should notify about table status changes', (done) => {
      let tableUpdateReceived = false;

      // All users should receive table status updates
      waiterSocket.on('table-status-updated', (data) => {
        expect(data.tableId).toBe(testTable.id);
        expect(data.tableNumber).toBe(testTable.number);
        expect(data.status).toBe(TableStatus.OCCUPIED);
        tableUpdateReceived = true;
      });

      adminSocket.on('table-status-updated', (data) => {
        expect(data.tableId).toBe(testTable.id);
        if (tableUpdateReceived) {
          done();
        }
      });

      // Create order to trigger table status change
      setTimeout(async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [
              {
                menuItemId: testMenuItem1.id,
                quantity: 1,
              },
            ],
          });
      }, 100);
    });

    it('should handle reconnection and sync properly', (done) => {
      let reconnectionHandled = false;

      // Create order first
      setTimeout(async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [
              {
                menuItemId: testMenuItem1.id,
                quantity: 1,
              },
            ],
          });

        // Disconnect and reconnect waiter
        waiterSocket.disconnect();

        setTimeout(async () => {
          const newWaiterSocket = await createSocketClient(waiterToken);
          
          newWaiterSocket.on('connected', (data) => {
            expect(data.isReconnection).toBe(true);
            expect(data.syncData).toBeDefined();
            expect(data.connectionId).toBeDefined();
            reconnectionHandled = true;
            newWaiterSocket.disconnect();
            done();
          });
        }, 500);
      }, 100);
    });

    it('should handle tables overview updates in real-time', (done) => {
      // Join tables overview room
      waiterSocket.emit('join-tables-overview');

      waiterSocket.on('joined-tables-overview', () => {
        // Listen for overview updates
        waiterSocket.on('tables-overview-update', (data) => {
          expect(data.timestamp).toBeDefined();
          expect(data.message).toBe('Painel de mesas atualizado');
          done();
        });

        // Create order to trigger overview update
        setTimeout(async () => {
          await request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${waiterToken}`)
            .send({
              tableId: testTable.id,
              items: [
                {
                  menuItemId: testMenuItem1.id,
                  quantity: 1,
                },
              ],
            });
        }, 100);
      });
    });

    it('should handle conflict resolution when multiple users modify same resource', (done) => {
      let conflictResolved = false;

      // Create order first
      setTimeout(async () => {
        const createOrderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [
              {
                menuItemId: testMenuItem1.id,
                quantity: 1,
              },
            ],
          });

        const orderItemId = createOrderResponse.body.items[0].id;

        // Simulate version conflict
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
          conflictResolved = true;
          done();
        });
      }, 100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid order creation attempts', async () => {
      // Try to create order for non-existent table
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: 99999,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(404);

      // Try to create order with invalid menu item
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: 'invalid-uuid',
              quantity: 1,
            },
          ],
        })
        .expect(400);

      // Try to create order with zero quantity
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 0,
            },
          ],
        })
        .expect(400);
    });

    it('should prevent creating order for occupied table', async () => {
      // Create first order
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      // Try to create second order for same table
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem2.id,
              quantity: 1,
            },
          ],
        })
        .expect(400);
    });

    it('should handle invalid status transitions', async () => {
      // Create order
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderItemId = createOrderResponse.body.items[0].id;

      // Try invalid status transition (PENDING -> DELIVERED)
      await request(app.getHttpServer())
        .patch(`/order-items/${orderItemId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderItemStatus.DELIVERED })
        .expect(400);
    });

    it('should prevent closing order with pending items', async () => {
      // Create order
      const createOrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;

      // Try to close order with pending items
      const closeResponse = await request(app.getHttpServer())
        .post(`/orders/${orderId}/close`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(400);

      expect(closeResponse.body.message).toContain('pendentes');
    });

    it('should handle authentication errors properly', async () => {
      // No token
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(401);

      // Invalid token
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          tableId: testTable.id,
          items: [
            {
              menuItemId: testMenuItem1.id,
              quantity: 1,
            },
          ],
        })
        .expect(401);
    });
  });
});