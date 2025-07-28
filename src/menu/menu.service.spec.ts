import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuItem, PriceHistory } from './entities';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';

describe('MenuService', () => {
  let service: MenuService;
  let menuItemRepository: Repository<MenuItem>;
  let priceHistoryRepository: Repository<PriceHistory>;

  const mockMenuItem: MenuItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Pizza Margherita',
    description: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
    price: 29.99,
    category: 'Pizzas',
    isAvailable: true,
    preparationTime: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMenuItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPriceHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: getRepositoryToken(MenuItem),
          useValue: mockMenuItemRepository,
        },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: mockPriceHistoryRepository,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    menuItemRepository = module.get<Repository<MenuItem>>(
      getRepositoryToken(MenuItem),
    );
    priceHistoryRepository = module.get<Repository<PriceHistory>>(
      getRepositoryToken(PriceHistory),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createMenuItemDto: CreateMenuItemDto = {
      name: 'Pizza Margherita',
      description: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
      price: 29.99,
      category: 'Pizzas',
      isAvailable: true,
      preparationTime: 15,
    };

    it('should create a new menu item successfully', async () => {
      mockMenuItemRepository.findOne.mockResolvedValue(null);
      mockMenuItemRepository.create.mockReturnValue(mockMenuItem);
      mockMenuItemRepository.save.mockResolvedValue(mockMenuItem);

      const result = await service.create(createMenuItemDto);

      expect(mockMenuItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: createMenuItemDto.name },
      });
      expect(mockMenuItemRepository.create).toHaveBeenCalledWith(createMenuItemDto);
      expect(mockMenuItemRepository.save).toHaveBeenCalledWith(mockMenuItem);
      expect(result).toEqual(mockMenuItem);
    });

    it('should throw BadRequestException if item with same name exists', async () => {
      mockMenuItemRepository.findOne.mockResolvedValue(mockMenuItem);

      await expect(service.create(createMenuItemDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockMenuItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: createMenuItemDto.name },
      });
    });
  });

  describe('findAll', () => {
    it('should return all menu items ordered by category and name', async () => {
      const menuItems = [mockMenuItem];
      mockMenuItemRepository.find.mockResolvedValue(menuItems);

      const result = await service.findAll();

      expect(mockMenuItemRepository.find).toHaveBeenCalledWith({
        order: { category: 'ASC', name: 'ASC' },
      });
      expect(result).toEqual(menuItems);
    });
  });

  describe('findAvailable', () => {
    it('should return only available menu items', async () => {
      const availableItems = [mockMenuItem];
      mockMenuItemRepository.find.mockResolvedValue(availableItems);

      const result = await service.findAvailable();

      expect(mockMenuItemRepository.find).toHaveBeenCalledWith({
        where: { isAvailable: true },
        order: { category: 'ASC', name: 'ASC' },
      });
      expect(result).toEqual(availableItems);
    });
  });

  describe('findOne', () => {
    it('should return a menu item by id', async () => {
      mockMenuItemRepository.findOne.mockResolvedValue(mockMenuItem);

      const result = await service.findOne(mockMenuItem.id);

      expect(mockMenuItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockMenuItem.id },
      });
      expect(result).toEqual(mockMenuItem);
    });

    it('should throw NotFoundException if item not found', async () => {
      mockMenuItemRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateMenuItemDto: UpdateMenuItemDto = {
      price: 35.99,
    };
    const userId = 'user-123';

    it('should update menu item and create price history', async () => {
      const updatedMenuItem = { ...mockMenuItem, price: 35.99 };
      mockMenuItemRepository.findOne.mockResolvedValue(mockMenuItem);
      mockMenuItemRepository.save.mockResolvedValue(updatedMenuItem);
      mockPriceHistoryRepository.create.mockReturnValue({});
      mockPriceHistoryRepository.save.mockResolvedValue({});

      const result = await service.update(mockMenuItem.id, updateMenuItemDto, userId);

      expect(mockPriceHistoryRepository.create).toHaveBeenCalledWith({
        menuItemId: mockMenuItem.id,
        oldPrice: 29.99,
        newPrice: 35.99,
        changedBy: userId,
      });
      expect(result.price).toBe(35.99);
    });

    it('should throw BadRequestException if name conflicts with existing item', async () => {
      const updateDto = { name: 'Existing Pizza' };
      const existingItem = { ...mockMenuItem, id: 'different-id' };
      
      mockMenuItemRepository.findOne
        .mockResolvedValueOnce(mockMenuItem) // First call for findOne
        .mockResolvedValueOnce(existingItem); // Second call for name conflict check

      await expect(service.update(mockMenuItem.id, updateDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a menu item', async () => {
      mockMenuItemRepository.findOne.mockResolvedValue(mockMenuItem);
      mockMenuItemRepository.remove.mockResolvedValue(mockMenuItem);

      await service.remove(mockMenuItem.id);

      expect(mockMenuItemRepository.remove).toHaveBeenCalledWith(mockMenuItem);
    });
  });

  describe('toggleAvailability', () => {
    it('should toggle item availability', async () => {
      const toggledItem = { ...mockMenuItem, isAvailable: false };
      mockMenuItemRepository.findOne.mockResolvedValue(mockMenuItem);
      mockMenuItemRepository.save.mockResolvedValue(toggledItem);

      const result = await service.toggleAvailability(mockMenuItem.id, 'user-123');

      expect(result.isAvailable).toBe(false);
      expect(mockMenuItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { category: 'Pizzas' },
          { category: 'Bebidas' },
        ]),
      };

      mockMenuItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCategories();

      expect(result).toEqual(['Pizzas', 'Bebidas']);
    });
  });
});