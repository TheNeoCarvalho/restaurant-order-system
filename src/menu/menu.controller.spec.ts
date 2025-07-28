import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto, MenuItemResponseDto } from './dto';
import { MenuItem } from './entities';
import { User } from '../users/entities';
import { UserRole } from '../common/enums/user-role.enum';

describe('MenuController', () => {
  let controller: MenuController;
  let service: MenuService;

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

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'admin@test.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    password: 'hashedpassword',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMenuService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAvailable: jest.fn(),
    findByCategory: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggleAvailability: jest.fn(),
    getPriceHistory: jest.fn(),
    getCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        {
          provide: MenuService,
          useValue: mockMenuService,
        },
      ],
    }).compile();

    controller = module.get<MenuController>(MenuController);
    service = module.get<MenuService>(MenuService);
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

    it('should create a new menu item', async () => {
      mockMenuService.create.mockResolvedValue(mockMenuItem);

      const result = await controller.create(createMenuItemDto);

      expect(mockMenuService.create).toHaveBeenCalledWith(createMenuItemDto);
      expect(result).toBeInstanceOf(MenuItemResponseDto);
      expect(result.name).toBe(mockMenuItem.name);
    });
  });

  describe('findAll', () => {
    it('should return all menu items', async () => {
      mockMenuService.findAll.mockResolvedValue([mockMenuItem]);

      const result = await controller.findAll();

      expect(mockMenuService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MenuItemResponseDto);
    });

    it('should return only available items when available=true', async () => {
      mockMenuService.findAvailable.mockResolvedValue([mockMenuItem]);

      const result = await controller.findAll('true');

      expect(mockMenuService.findAvailable).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return items by category when category is provided', async () => {
      mockMenuService.findByCategory.mockResolvedValue([mockMenuItem]);

      const result = await controller.findAll(undefined, 'Pizzas');

      expect(mockMenuService.findByCategory).toHaveBeenCalledWith('Pizzas');
      expect(result).toHaveLength(1);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const categories = ['Pizzas', 'Bebidas'];
      mockMenuService.getCategories.mockResolvedValue(categories);

      const result = await controller.getCategories();

      expect(mockMenuService.getCategories).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('findOne', () => {
    it('should return a specific menu item', async () => {
      mockMenuService.findOne.mockResolvedValue(mockMenuItem);

      const result = await controller.findOne(mockMenuItem.id);

      expect(mockMenuService.findOne).toHaveBeenCalledWith(mockMenuItem.id);
      expect(result).toBeInstanceOf(MenuItemResponseDto);
      expect(result.id).toBe(mockMenuItem.id);
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history for a menu item', async () => {
      const priceHistory = [
        {
          id: 'history-1',
          menuItemId: mockMenuItem.id,
          oldPrice: 25.99,
          newPrice: 29.99,
          changedBy: 'user-123',
          changedAt: new Date(),
        },
      ];
      mockMenuService.getPriceHistory.mockResolvedValue(priceHistory);

      const result = await controller.getPriceHistory(mockMenuItem.id);

      expect(mockMenuService.getPriceHistory).toHaveBeenCalledWith(mockMenuItem.id);
      expect(result).toEqual(priceHistory);
    });
  });

  describe('update', () => {
    const updateMenuItemDto: UpdateMenuItemDto = {
      price: 35.99,
    };

    it('should update a menu item', async () => {
      const updatedMenuItem = { ...mockMenuItem, price: 35.99 };
      mockMenuService.update.mockResolvedValue(updatedMenuItem);

      const result = await controller.update(
        mockMenuItem.id,
        updateMenuItemDto,
        mockUser as User,
      );

      expect(mockMenuService.update).toHaveBeenCalledWith(
        mockMenuItem.id,
        updateMenuItemDto,
        mockUser.id,
      );
      expect(result).toBeInstanceOf(MenuItemResponseDto);
      expect(result.price).toBe(35.99);
    });
  });

  describe('toggleAvailability', () => {
    it('should toggle item availability', async () => {
      const toggledMenuItem = { ...mockMenuItem, isAvailable: false };
      mockMenuService.toggleAvailability.mockResolvedValue(toggledMenuItem);

      const result = await controller.toggleAvailability(mockMenuItem.id, mockUser as User);

      expect(mockMenuService.toggleAvailability).toHaveBeenCalledWith(
        mockMenuItem.id,
        mockUser.id,
      );
      expect(result).toBeInstanceOf(MenuItemResponseDto);
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove a menu item', async () => {
      mockMenuService.remove.mockResolvedValue(undefined);

      await controller.remove(mockMenuItem.id);

      expect(mockMenuService.remove).toHaveBeenCalledWith(mockMenuItem.id);
    });
  });
});