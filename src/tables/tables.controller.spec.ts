import { Test, TestingModule } from '@nestjs/testing';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto';
import { TableStatus } from '../common/enums/table-status.enum';
import { UserRole } from '../users/enums/user-role.enum';

describe('TablesController', () => {
  let controller: TablesController;
  let service: TablesService;

  const mockTablesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAvailable: jest.fn(),
    findOccupied: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    checkAvailability: jest.fn(),
    getTablesSummary: jest.fn(),
  };

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: mockTablesService,
        },
      ],
    }).compile();

    controller = module.get<TablesController>(TablesController);
    service = module.get<TablesService>(TablesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new table', async () => {
      const createTableDto: CreateTableDto = {
        number: 1,
        capacity: 4,
      };

      const expectedTable = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTablesService.create.mockResolvedValue(expectedTable);

      const result = await controller.create(createTableDto, mockUser);

      expect(mockTablesService.create).toHaveBeenCalledWith(createTableDto);
      expect(result).toEqual(expectedTable);
    });
  });

  describe('findAll', () => {
    it('should return all tables', async () => {
      const expectedTables = [
        {
          id: 1,
          number: 1,
          capacity: 4,
          status: TableStatus.AVAILABLE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          number: 2,
          capacity: 2,
          status: TableStatus.OCCUPIED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockTablesService.findAll.mockResolvedValue(expectedTables);

      const result = await controller.findAll(mockUser);

      expect(mockTablesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedTables);
    });
  });

  describe('findAvailable', () => {
    it('should return available tables', async () => {
      const expectedTables = [
        {
          id: 1,
          number: 1,
          capacity: 4,
          status: TableStatus.AVAILABLE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockTablesService.findAvailable.mockResolvedValue(expectedTables);

      const result = await controller.findAvailable(mockUser);

      expect(mockTablesService.findAvailable).toHaveBeenCalled();
      expect(result).toEqual(expectedTables);
    });
  });

  describe('findOne', () => {
    it('should return a table by id', async () => {
      const expectedTable = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTablesService.findOne.mockResolvedValue(expectedTable);

      const result = await controller.findOne(1, mockUser);

      expect(mockTablesService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedTable);
    });
  });

  describe('checkAvailability', () => {
    it('should return availability status', async () => {
      mockTablesService.checkAvailability.mockResolvedValue(true);

      const result = await controller.checkAvailability(1, mockUser);

      expect(mockTablesService.checkAvailability).toHaveBeenCalledWith(1);
      expect(result).toEqual({ available: true });
    });
  });

  describe('update', () => {
    it('should update a table', async () => {
      const updateTableDto: UpdateTableDto = {
        capacity: 6,
      };

      const expectedTable = {
        id: 1,
        number: 1,
        capacity: 6,
        status: TableStatus.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTablesService.update.mockResolvedValue(expectedTable);

      const result = await controller.update(1, updateTableDto, mockUser);

      expect(mockTablesService.update).toHaveBeenCalledWith(1, updateTableDto);
      expect(result).toEqual(expectedTable);
    });
  });

  describe('updateStatus', () => {
    it('should update table status', async () => {
      const updateStatusDto: UpdateTableStatusDto = {
        status: TableStatus.OCCUPIED,
      };

      const expectedTable = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.OCCUPIED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTablesService.updateStatus.mockResolvedValue(expectedTable);

      const result = await controller.updateStatus(1, updateStatusDto, mockUser);

      expect(mockTablesService.updateStatus).toHaveBeenCalledWith(1, updateStatusDto);
      expect(result).toEqual(expectedTable);
    });
  });

  describe('remove', () => {
    it('should remove a table', async () => {
      mockTablesService.remove.mockResolvedValue(undefined);

      await controller.remove(1, mockUser);

      expect(mockTablesService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('getTablesSummary', () => {
    it('should return tables summary', async () => {
      const expectedSummary = {
        total: 10,
        available: 5,
        occupied: 3,
        reserved: 1,
        cleaning: 1,
      };

      mockTablesService.getTablesSummary.mockResolvedValue(expectedSummary);

      const result = await controller.getTablesSummary(mockUser);

      expect(mockTablesService.getTablesSummary).toHaveBeenCalled();
      expect(result).toEqual(expectedSummary);
    });
  });
});