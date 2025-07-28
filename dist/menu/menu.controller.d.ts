import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto, MenuItemResponseDto } from './dto';
import { User } from '../users/entities';
export declare class MenuController {
    private readonly menuService;
    constructor(menuService: MenuService);
    create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto>;
    findAll(available?: string, category?: string): Promise<MenuItemResponseDto[]>;
    getCategories(): Promise<string[]>;
    findOne(id: string): Promise<MenuItemResponseDto>;
    getPriceHistory(id: string): Promise<import("./entities").PriceHistory[]>;
    update(id: string, updateMenuItemDto: UpdateMenuItemDto, user: User): Promise<MenuItemResponseDto>;
    toggleAvailability(id: string, user: User): Promise<MenuItemResponseDto>;
    remove(id: string): Promise<void>;
}
