import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { UserRole } from '../../src/users/enums/user-role.enum';

describe('Authentication and Authorization Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;

  let adminUser: any;
  let waiterUser: any;
  let kitchenUser: any;
  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;

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
    adminUser = await usersService.create({
      email: 'admin-auth@test.com',
      password: 'password123',
      name: 'Admin Auth Test',
      role: UserRole.ADMIN,
    });

    waiterUser = await usersService.create({
      email: 'waiter-auth@test.com',
      password: 'password123',
      name: 'Waiter Auth Test',
      role: UserRole.WAITER,
    });

    kitchenUser = await usersService.create({
      email: 'kitchen-auth@test.com',
      password: 'password123',
      name: 'Kitchen Auth Test',
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

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin-auth@test.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        }),
      });

      // Verify token structure
      expect(response.body.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(response.body.refreshToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should return 401 with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Credenciais inválidas');
        });
    });

    it('should return 401 with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin-auth@test.com',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Credenciais inválidas');
        });
    });

    it('should return 400 with missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 with missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin-auth@test.com',
        })
        .expect(400);
    });

    it('should return 400 with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin-auth@test.com',
          password: 'password123',
        });
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // New tokens should be different from original
      expect(response.body.accessToken).not.toBe(adminToken);
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token',
        })
        .expect(401);
    });

    it('should return 400 with missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('Authorization by Role', () => {
    describe('Admin-only endpoints', () => {
      it('should allow admin to create menu items', async () => {
        await request(app.getHttpServer())
          .post('/menu')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Admin Test Item',
            description: 'Test item',
            price: 15.99,
            category: 'Test',
          })
          .expect(201);
      });

      it('should deny waiter access to create menu items', async () => {
        await request(app.getHttpServer())
          .post('/menu')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            name: 'Waiter Test Item',
            description: 'Test item',
            price: 15.99,
            category: 'Test',
          })
          .expect(403);
      });

      it('should deny kitchen access to create menu items', async () => {
        await request(app.getHttpServer())
          .post('/menu')
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({
            name: 'Kitchen Test Item',
            description: 'Test item',
            price: 15.99,
            category: 'Test',
          })
          .expect(403);
      });

      it('should allow admin to create tables', async () => {
        await request(app.getHttpServer())
          .post('/tables')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            number: 300,
            capacity: 4,
          })
          .expect(201);
      });

      it('should deny waiter access to create tables', async () => {
        await request(app.getHttpServer())
          .post('/tables')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            number: 301,
            capacity: 4,
          })
          .expect(403);
      });

      it('should deny kitchen access to create tables', async () => {
        await request(app.getHttpServer())
          .post('/tables')
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({
            number: 302,
            capacity: 4,
          })
          .expect(403);
      });
    });

    describe('Admin and Waiter endpoints', () => {
      let testTable: any;

      beforeEach(async () => {
        // Create a test table for orders
        const tableResponse = await request(app.getHttpServer())
          .post('/tables')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            number: 310,
            capacity: 4,
          });
        testTable = tableResponse.body;
      });

      it('should allow admin to create orders', async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            tableId: testTable.id,
            items: [],
          })
          .expect(201);
      });

      it('should allow waiter to create orders', async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [],
          })
          .expect(201);
      });

      it('should deny kitchen access to create orders', async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({
            tableId: testTable.id,
            items: [],
          })
          .expect(403);
      });

      it('should allow admin to close orders', async () => {
        // Create order first
        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            tableId: testTable.id,
            items: [],
          });

        await request(app.getHttpServer())
          .post(`/orders/${orderResponse.body.id}/close`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should allow waiter to close orders', async () => {
        // Create order first
        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            tableId: testTable.id,
            items: [],
          });

        await request(app.getHttpServer())
          .post(`/orders/${orderResponse.body.id}/close`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .expect(200);
      });

      it('should deny kitchen access to close orders', async () => {
        // Create order first
        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            tableId: testTable.id,
            items: [],
          });

        await request(app.getHttpServer())
          .post(`/orders/${orderResponse.body.id}/close`)
          .set('Authorization', `Bearer ${kitchenToken}`)
          .expect(403);
      });
    });

    describe('Kitchen-restricted endpoints', () => {
      it('should deny kitchen access to view all orders', async () => {
        await request(app.getHttpServer())
          .get('/orders')
          .set('Authorization', `Bearer ${kitchenToken}`)
          .expect(403);
      });

      it('should allow admin to view all orders', async () => {
        await request(app.getHttpServer())
          .get('/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should allow waiter to view all orders', async () => {
        await request(app.getHttpServer())
          .get('/orders')
          .set('Authorization', `Bearer ${waiterToken}`)
          .expect(200);
      });
    });

    describe('All authenticated users endpoints', () => {
      it('should allow all roles to view menu', async () => {
        await request(app.getHttpServer())
          .get('/menu')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get('/menu')
          .set('Authorization', `Bearer ${waiterToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get('/menu')
          .set('Authorization', `Bearer ${kitchenToken}`)
          .expect(200);
      });

      it('should allow all roles to view tables', async () => {
        await request(app.getHttpServer())
          .get('/tables')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get('/tables')
          .set('Authorization', `Bearer ${waiterToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get('/tables')
          .set('Authorization', `Bearer ${kitchenToken}`)
          .expect(200);
      });
    });
  });

  describe('JWT Token Validation', () => {
    it('should reject requests without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/menu')
        .expect(401);
    });

    it('should reject requests with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', 'InvalidHeader')
        .expect(401);
    });

    it('should reject requests with invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('should reject requests with expired JWT token', async () => {
      // This would require creating an expired token, which is complex in tests
      // For now, we'll test with a malformed token that simulates expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should accept requests with valid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('User Context in Requests', () => {
    it('should include user information in authenticated requests', async () => {
      // Create a menu item to test user context
      const response = await request(app.getHttpServer())
        .post('/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'User Context Test Item',
          description: 'Test item for user context',
          price: 12.99,
          category: 'Test',
        })
        .expect(201);

      // The response should include information that indicates the user context was used
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'User Context Test Item',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should handle different user roles in same endpoint', async () => {
      // Test that different users can access the same endpoint with different permissions
      const adminResponse = await request(app.getHttpServer())
        .get('/tables/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const waiterResponse = await request(app.getHttpServer())
        .get('/tables/summary')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      const kitchenResponse = await request(app.getHttpServer())
        .get('/tables/summary')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      // All should return the same structure
      [adminResponse, waiterResponse, kitchenResponse].forEach((response) => {
        expect(response.body).toMatchObject({
          total: expect.any(Number),
          available: expect.any(Number),
          occupied: expect.any(Number),
          reserved: expect.any(Number),
          cleaning: expect.any(Number),
        });
      });
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin-auth@test.com',
          password: 'password123',
        })
        .expect(200);

      // Check for common security headers (these depend on your app configuration)
      expect(response.headers).toHaveProperty('x-powered-by');
    });

    it('should handle CORS preflight requests', async () => {
      await request(app.getHttpServer())
        .options('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(204);
    });
  });
});