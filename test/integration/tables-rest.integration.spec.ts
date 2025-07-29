import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { UserRole } from '../../src/users/enums/user-role.enum';
import { TableStatus } from '../../src/common/enums/table-status.enum';

describe('Tables REST API Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;

  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let testTable: any;

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
      email: 'admin-tables@test.com',
      password: 'password123',
      name: 'Admin Tables Test',
      role: UserRole.ADMIN,
    });

    const waiterUser = await usersService.create({
      email: 'waiter-tables@test.com',
      password: 'password123',
      name: 'Waiter Tables Test',
      role: UserRole.WAITER,
    });

    const kitchenUser = await usersService.create({
      email: 'kitchen-tables@test.com',
      password: 'password123',
      name: 'Kitchen Tables Test',
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

  describe('POST /tables', () => {
    it('should create table as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 200,
          capacity: 6,
        })
        .expect(201);

      testTable = response.body;

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        number: 200,
        capacity: 6,
        status: TableStatus.AVAILABLE,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should create table with default capacity', async () => {
      const response = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 201,
        })
        .expect(201);

      expect(response.body.capacity).toBe(4); // Default capacity
    });

    it('should return 409 when table number already exists', async () => {
      // Create first table
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 202,
          capacity: 4,
        })
        .expect(201);

      // Try to create table with same number
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 202,
          capacity: 2,
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('já existe');
        });
    });

    it('should return 403 when waiter tries to create table', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          number: 203,
          capacity: 4,
        })
        .expect(403);
    });

    it('should return 403 when kitchen user tries to create table', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          number: 204,
          capacity: 4,
        })
        .expect(403);
    });

    it('should return 400 when table number is missing', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          capacity: 4,
        })
        .expect(400);
    });

    it('should return 400 when capacity is negative', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 205,
          capacity: -1,
        })
        .expect(400);
    });
  });

  describe('GET /tables', () => {
    beforeEach(async () => {
      // Ensure we have a test table
      if (!testTable) {
        const response = await request(app.getHttpServer())
          .post('/tables')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            number: 210,
            capacity: 4,
          });
        testTable = response.body;
      }
    });

    it('should return all tables for any authenticated user', async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const waiterResponse = await request(app.getHttpServer())
        .get('/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      const kitchenResponse = await request(app.getHttpServer())
        .get('/tables')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      [adminResponse, waiterResponse, kitchenResponse].forEach((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const table = response.body.find((table: any) => table.id === testTable.id);
        expect(table).toBeDefined();
      });
    });

    it('should return tables ordered by number', async () => {
      const response = await request(app.getHttpServer())
        .get('/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Check if tables are ordered by number
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i].number).toBeGreaterThanOrEqual(response.body[i - 1].number);
      }
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/tables')
        .expect(401);
    });
  });

  describe('GET /tables/:id', () => {
    it('should return specific table', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testTable.id,
        number: testTable.number,
        capacity: testTable.capacity,
        status: testTable.status,
      });
    });

    it('should return 404 for non-existent table', async () => {
      await request(app.getHttpServer())
        .get('/tables/99999')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(404);
    });
  });

  describe('PATCH /tables/:id', () => {
    it('should update table as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          capacity: 8,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testTable.id,
        capacity: 8,
        number: testTable.number, // Should remain unchanged
      });
    });

    it('should return 403 when waiter tries to update table', async () => {
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          capacity: 6,
        })
        .expect(403);
    });

    it('should return 409 when updating to existing table number', async () => {
      // Create another table
      const anotherTable = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 211,
          capacity: 4,
        });

      // Try to update first table to same number as second
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 211,
        })
        .expect(409);
    });
  });

  describe('PATCH /tables/:id/status', () => {
    it('should update table status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: TableStatus.CLEANING,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testTable.id,
        status: TableStatus.CLEANING,
      });
    });

    it('should return 400 when status is invalid', async () => {
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);
    });
  });

  describe('DELETE /tables/:id', () => {
    let tableToDelete: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 220,
          capacity: 4,
        });
      tableToDelete = response.body;
    });

    it('should delete table as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${tableToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify table is deleted
      await request(app.getHttpServer())
        .get(`/tables/${tableToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when waiter tries to delete table', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${tableToDelete.id}`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(403);
    });

    it('should return 409 when trying to delete occupied table', async () => {
      // First update table status to occupied
      await request(app.getHttpServer())
        .patch(`/tables/${tableToDelete.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: TableStatus.OCCUPIED,
        });

      // Try to delete occupied table
      await request(app.getHttpServer())
        .delete(`/tables/${tableToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('ocupada');
        });
    });
  });

  describe('GET /tables/available', () => {
    it('should return only available tables', async () => {
      // Create available table
      const availableTable = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 230,
          capacity: 4,
        });

      // Create occupied table
      const occupiedTable = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          number: 231,
          capacity: 4,
        });

      // Set second table as occupied
      await request(app.getHttpServer())
        .patch(`/tables/${occupiedTable.body.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: TableStatus.OCCUPIED,
        });

      const response = await request(app.getHttpServer())
        .get('/tables/available')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All tables should be available
      response.body.forEach((table: any) => {
        expect(table.status).toBe(TableStatus.AVAILABLE);
      });

      // Should include available table
      const foundAvailable = response.body.find((table: any) => table.id === availableTable.body.id);
      expect(foundAvailable).toBeDefined();

      // Should not include occupied table
      const foundOccupied = response.body.find((table: any) => table.id === occupiedTable.body.id);
      expect(foundOccupied).toBeUndefined();
    });
  });

  describe('GET /tables/summary', () => {
    it('should return tables summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/tables/summary')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        available: expect.any(Number),
        occupied: expect.any(Number),
        reserved: expect.any(Number),
        cleaning: expect.any(Number),
      });

      // Total should be sum of all statuses
      const { total, available, occupied, reserved, cleaning } = response.body;
      expect(total).toBe(available + occupied + reserved + cleaning);
    });
  });

  describe('GET /tables/:id/availability', () => {
    it('should return true for available table', async () => {
      // Ensure table is available
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: TableStatus.AVAILABLE,
        });

      const response = await request(app.getHttpServer())
        .get(`/tables/${testTable.id}/availability`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        available: true,
      });
    });

    it('should return false for occupied table', async () => {
      // Set table as occupied
      await request(app.getHttpServer())
        .patch(`/tables/${testTable.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          status: TableStatus.OCCUPIED,
        });

      const response = await request(app.getHttpServer())
        .get(`/tables/${testTable.id}/availability`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        available: false,
      });
    });
  });
});