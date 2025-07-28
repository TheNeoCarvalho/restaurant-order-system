import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem, PriceHistory } from './entities';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    // Check if item with same name already exists
    const existingItem = await this.menuItemRepository.findOne({
      where: { name: createMenuItemDto.name },
    });

    if (existingItem) {
      throw new BadRequestException(
        `Item com nome "${createMenuItemDto.name}" já existe no cardápio`,
      );
    }

    const menuItem = this.menuItemRepository.create(createMenuItemDto);
    return await this.menuItemRepository.save(menuItem);
  }

  async findAll(): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findAvailable(): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { isAvailable: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findByCategory(category: string): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { category },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<MenuItem> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id },
    });

    if (!menuItem) {
      throw new NotFoundException(`Item com ID "${id}" não encontrado`);
    }

    return menuItem;
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
    userId: string,
  ): Promise<MenuItem> {
    const menuItem = await this.findOne(id);

    // Check if name is being changed and if it conflicts with existing item
    if (
      updateMenuItemDto.name &&
      updateMenuItemDto.name !== menuItem.name
    ) {
      const existingItem = await this.menuItemRepository.findOne({
        where: { name: updateMenuItemDto.name },
      });

      if (existingItem) {
        throw new BadRequestException(
          `Item com nome "${updateMenuItemDto.name}" já existe no cardápio`,
        );
      }
    }

    // Track price changes
    if (
      updateMenuItemDto.price &&
      updateMenuItemDto.price !== menuItem.price
    ) {
      await this.createPriceHistoryEntry(
        menuItem,
        updateMenuItemDto.price,
        userId,
      );
    }

    // Update the menu item
    Object.assign(menuItem, updateMenuItemDto);
    return await this.menuItemRepository.save(menuItem);
  }

  async remove(id: string): Promise<void> {
    const menuItem = await this.findOne(id);
    await this.menuItemRepository.remove(menuItem);
  }

  async toggleAvailability(id: string, userId: string): Promise<MenuItem> {
    const menuItem = await this.findOne(id);
    menuItem.isAvailable = !menuItem.isAvailable;
    return await this.menuItemRepository.save(menuItem);
  }

  async getPriceHistory(id: string): Promise<PriceHistory[]> {
    await this.findOne(id); // Ensure menu item exists

    return await this.priceHistoryRepository.find({
      where: { menuItemId: id },
      order: { changedAt: 'DESC' },
    });
  }

  async getCategories(): Promise<string[]> {
    const result = await this.menuItemRepository
      .createQueryBuilder('menuItem')
      .select('DISTINCT menuItem.category', 'category')
      .orderBy('menuItem.category', 'ASC')
      .getRawMany();

    return result.map((item) => item.category);
  }

  private async createPriceHistoryEntry(
    menuItem: MenuItem,
    newPrice: number,
    userId: string,
  ): Promise<void> {
    const priceHistory = this.priceHistoryRepository.create({
      menuItemId: menuItem.id,
      oldPrice: menuItem.price,
      newPrice: newPrice,
      changedBy: userId,
    });

    await this.priceHistoryRepository.save(priceHistory);
  }
}