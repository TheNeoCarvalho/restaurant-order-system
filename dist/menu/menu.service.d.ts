import { Repository } from 'typeorm';
import { MenuItem, PriceHistory } from './entities';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';
export declare class MenuService {
    private readonly menuItemRepository;
    private readonly priceHistoryRepository;
    constructor(menuItemRepository: Repository<MenuItem>, priceHistoryRepository: Repository<PriceHistory>);
    create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem>;
    findAll(): Promise<MenuItem[]>;
    findAvailable(): Promise<MenuItem[]>;
    findByCategory(category: string): Promise<MenuItem[]>;
    findOne(id: string): Promise<MenuItem>;
    update(id: string, updateMenuItemDto: UpdateMenuItemDto, userId: string): Promise<MenuItem>;
    remove(id: string): Promise<void>;
    toggleAvailability(id: string, userId: string): Promise<MenuItem>;
    getPriceHistory(id: string): Promise<PriceHistory[]>;
    getCategories(): Promise<string[]>;
    private createPriceHistoryEntry;
}
