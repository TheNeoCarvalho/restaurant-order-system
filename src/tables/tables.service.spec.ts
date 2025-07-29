import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TablesService } from './tables.service';
import { Table } from './entities/table.entity';
import { Order } from '../orders/entities/order.entity';
import { TableStatus } from '../common/enums/table-status.enum';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto';
import { OrdersGateway } from '../websocket/orders.gateway';

describe('TablesService', () => {
  let service: TablesService;
  let repository: Repository<Table>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrdersGateway = {
    notifyNewOrder: jest.fn(),
    notifyOrderItemStatusUpdate: jest.fn(),
    notifyTableStatusUpdate: jest.fn(),
    notifyOrderClosed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: getRepositoryToken(Table),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: OrdersGateway,
          useValue: mockOrdersGateway,
        },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    repository = module.get<Repository<Table>>(getRepositoryToken(Table));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new table successfully', async () => {
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

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(expectedTable);
      mockRepository.save.mockResolvedValue(expectedTable);

      const result = await service.create(createTableDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { number: createTableDto.number },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createTableDto,
        capacity: 4,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(expectedTable);
      expect(result).toEqual(expectedTable);
    });

    it('should throw ConflictException if table number already exists', async () => {
      const createTableDto: CreateTableDto = {
        number: 1,
        capacity: 4,
      };

      const existingTable = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
      };

      mockRepository.findOne.mockResolvedValue(existingTable);

      await expect(service.create(createTableDto)).rejects.toThrow(
        new ConflictException('Mesa número 1 já existe'),
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { number: createTableDto.number },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should use default capacity if not provided', async () => {
      const createTableDto: CreateTableDto = {
        number: 1,
      };

      const expectedTable = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(expectedTable);
      mockRepository.save.mockResolvedValue(expectedTable);

      await service.create(createTableDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createTableDto,
        capacity: 4,
      });
    });
  });

  describe('findAll', () => {
    it('should return all tables ordered by number', async () => {
      const expectedTables = [
        { id: 1, number: 1, capacity: 4, status: TableStatus.AVAILABLE },
        { id: 2, number: 2, capacity: 2, status: TableStatus.OCCUPIED },
      ];

      mockRepository.find.mockResolvedValue(expectedTables);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { number: 'ASC' },
      });
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
      };

      mockRepository.findOne.mockResolvedValue(expectedTable);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedTable);
    });

    it('should throw NotFoundException if table not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(
        new NotFoundException('Mesa com ID 1 não encontrada'),
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update table status successfully', async () => {
      const existingTable = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
      };

      const updateStatusDto: UpdateTableStatusDto = {
        status: TableStatus.OCCUPIED,
      };

      const updatedTable = {
        ...existingTable,
        status: TableStatus.OCCUPIED,
      };

      mockRepository.findOne.mockResolvedValue(existingTable);
      mockRepository.save.mockResolvedValue(updatedTable);

      const result = await service.updateStatus(1, updateStatusDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingTable,
        status: TableStatus.OCCUPIED,
      });
      expect(result).toEqual(updatedTable);
    });
  });

  describe('checkAvailability', () => {
    it('should return true if table is available', async () => {
      const table = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
      };

      mockRepository.findOne.mockResolvedValue(table);

      const result = await service.checkAvailability(1);

      expect(result).toBe(true);
    });

    it('should return false if table is not available', async () => {
      const table = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.OCCUPIED,
      };

      mockRepository.findOne.mockResolvedValue(table);

      const result = await service.checkAvailability(1);

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove table successfully if not occupied', async () => {
      const table = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.AVAILABLE,
      };

      mockRepository.findOne.mockResolvedValue(table);
      mockRepository.remove.mockResolvedValue(table);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(table);
    });

    it('should throw ConflictException if trying to remove occupied table', async () => {
      const table = {
        id: 1,
        number: 1,
        capacity: 4,
        status: TableStatus.OCCUPIED,
      };

      mockRepository.findOne.mockResolvedValue(table);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Não é possível remover uma mesa ocupada'),
      );

      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getTablesSummary', () => {
    it('should return tables summary with counts by status', async () => {
      mockRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // available
        .mockResolvedValueOnce(3)  // occupied
        .mockResolvedValueOnce(1)  // reserved
        .mockResolvedValueOnce(1); // cleaning

      const result = await service.getTablesSummary();

      expect(result).toEqual({
        total: 10,
        available: 5,
        occupied: 3,
        reserved: 1,
        cleaning: 1,
      });

      expect(mockRepository.count).toHaveBeenCalledTimes(5);
    });
  });
});