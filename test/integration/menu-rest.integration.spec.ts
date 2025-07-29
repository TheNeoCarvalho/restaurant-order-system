import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { UserRole } from '../../src/users/enums/user-role.enum';

describe('Menu REST API Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;

  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let testMenuItem: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);

    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create test users
    const adminUser = await usersService.create({
      email: 'admin-menu@test.com',
      password: 'password123',
      name: 'Admin Menu Test',
      role: UserRole.ADMIN,
    });

    const waiterUser = await usersService.create({
      email: 'waiter-menu@test.com',
      password: 'password123',
      name: 'Waiter Menu Test',
      role: UserRole.WAITER,
    });

    const kitchenUser = await usersService.create({
      email: 'kitchen-menu@test.com',
      password: 'password123',
      name: 'Kitchen Menu Test',
      role: UserRole.KITCHEN,
    });

    // Generate tokens
    const adminAuth = await authService.login(adminUser);
    const waiterAuth = await authService.login(waiterUser);
    const kitchenAuth = await authService.login(kitchenUser);

    adminToken = adminAuth.accessToken;
    waiterToken = waiterAuth.accessToken;
    kitchenToken = kitchenAuth.accessToken;
  }

  describe('POST /menu', () => {
    it('should create menu item as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Integration Test Pizza',
          description: 'Pizza for integration testing',
          price: 29.99,
          category: 'Pizzas',
          preparationTime: 20,
          isAvailable: true,
        })
        .expect(201);

      testMenuItem = response.body;

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Integration Test Pizza',
        description: 'Pizza for integration testing',
        price: 29.99,
        category: 'Pizzas',
        preparationTime: 20,
        isAvailable: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return 403 when waiter tries to create menu item', async () => {
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Unauthorized Pizza',
          description: 'Should not be created',
          price: 25.99,
          category: 'Pizzas',
        })
        .expect(403);
    });

    it('should return 403 when kitchen user tries to create menu item', async () => {
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          name: 'Unauthorized Burger',
          description: 'Should not be created',
          price: 19.99,
          category: 'Burgers',
        })
        .expect(403);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name and price',
          category: 'Test',
        })
        .expect(400);
    });

    it('should return 400 when price is negative', async () => {
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Negative Price Item',
          description: 'Should fail validation',
          price: -10.99,
          category: 'Test',
        })
        .expect(400);
    });

    it('should return 400 when item with same name already exists', async () => {
      // First item
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Name Test',
          description: 'First item',
          price: 15.99,
          category: 'Test',
        })
        .expect(201);

      // Duplicate name should fail
      await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Name Test',
          description: 'Second item with same name',
          price: 20.99,
          category: 'Test',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('já existe');
        });
    });
  });

  describe('GET /menu', () => {
    beforeEach(async () => {
      // Ensure we have a test menu item
      if (!testMenuItem) {
        const response = await request(app.getHttpServer())
          .post('/menu')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Item for GET',
            description: 'Test item',
            price: 15.99,
            category: 'Test',
          });
        testMenuItem = response.body;
      }
    });

    it('should return all menu items for any authenticated user', async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const waiterResponse = await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      const kitchenResponse = await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      [adminResponse, waiterResponse, kitchenResponse].forEach((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const item = response.body.find((item: any) => item.id === testMenuItem.id);
        expect(item).toBeDefined();
      });
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/menu')
        .expect(401);
    });
  });

  describe('GET /menu/available', () => {
    it('should return only available menu items', async () => {
      // Create available item
      const availableItem = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Available Item',
          description: 'This item is available',
          price: 12.99,
          category: 'Test',
          isAvailable: true,
        });

      // Create unavailable item
      const unavailableItem = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Unavailable Item',
          description: 'This item is not available',
          price: 18.99,
          category: 'Test',
          isAvailable: false,
        });

      const response = await request(app.getHttpServer())
        .get('/menu/available')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All items should be available
      response.body.forEach((item: any) => {
        expect(item.isAvailable).toBe(true);
      });

      // Should include available item
      const foundAvailable = response.body.find((item: any) => item.id === availableItem.body.id);
      expect(foundAvailable).toBeDefined();

      // Should not include unavailable item
      const foundUnavailable = response.body.find((item: any) => item.id === unavailableItem.body.id);
      expect(foundUnavailable).toBeUndefined();
    });
  });

  describe('GET /menu/:id', () => {
    it('should return specific menu item', async () => {
      const response = await request(app.getHttpServer())
        .get(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testMenuItem.id,
        name: testMenuItem.name,
        description: testMenuItem.description,
        price: testMenuItem.price,
        category: testMenuItem.category,
      });
    });

    it('should return 404 for non-existent menu item', async () => {
      await request(app.getHttpServer())
        .get('/menu/non-existent-id')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(404);
    });
  });

  describe('PATCH /menu/:id', () => {
    it('should update menu item as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 35.99,
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testMenuItem.id,
        price: 35.99,
        description: 'Updated description',
        name: testMenuItem.name, // Should remain unchanged
      });
    });

    it('should return 403 when waiter tries to update menu item', async () => {
      await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          price: 40.99,
        })
        .expect(403);
    });

    it('should return 404 when updating non-existent item', async () => {
      await request(app.getHttpServer())
        .patch('/menu/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 25.99,
        })
        .expect(404);
    });
  });

  describe('DELETE /menu/:id', () => {
    let itemToDelete: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Item to Delete',
          description: 'This item will be deleted',
          price: 10.99,
          category: 'Test',
        });
      itemToDelete = response.body;
    });

    it('should delete menu item as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/menu/${itemToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify item is deleted
      await request(app.getHttpServer())
        .get(`/menu/${itemToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when waiter tries to delete menu item', async () => {
      await request(app.getHttpServer())
        .delete(`/menu/${itemToDelete.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(403);
    });
  });

  describe('PATCH /menu/:id/toggle-availability', () => {
    it('should toggle availability as admin', async () => {
      const initialAvailability = testMenuItem.isAvailable;

      const response = await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}/toggle-availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isAvailable).toBe(!initialAvailability);

      // Toggle back
      const response2 = await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}/toggle-availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.isAvailable).toBe(initialAvailability);
    });

    it('should return 403 when non-admin tries to toggle availability', async () => {
      await request(app.getHttpServer())
        .patch(`/menu/${testMenuItem.id}/toggle-availability`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(403);
    });
  });

  describe('GET /menu/categories', () => {
    it('should return list of categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/categories')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toContain('Test'); // From our test items
    });
  });
});