"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
let MenuService = class MenuService {
    menuItemRepository;
    priceHistoryRepository;
    constructor(menuItemRepository, priceHistoryRepository) {
        this.menuItemRepository = menuItemRepository;
        this.priceHistoryRepository = priceHistoryRepository;
    }
    async create(createMenuItemDto) {
        const existingItem = await this.menuItemRepository.findOne({
            where: { name: createMenuItemDto.name },
        });
        if (existingItem) {
            throw new common_1.BadRequestException(`Item com nome "${createMenuItemDto.name}" já existe no cardápio`);
        }
        const menuItem = this.menuItemRepository.create(createMenuItemDto);
        return await this.menuItemRepository.save(menuItem);
    }
    async findAll() {
        return await this.menuItemRepository.find({
            order: { category: 'ASC', name: 'ASC' },
        });
    }
    async findAvailable() {
        return await this.menuItemRepository.find({
            where: { isAvailable: true },
            order: { category: 'ASC', name: 'ASC' },
        });
    }
    async findByCategory(category) {
        return await this.menuItemRepository.find({
            where: { category },
            order: { name: 'ASC' },
        });
    }
    async findOne(id) {
        const menuItem = await this.menuItemRepository.findOne({
            where: { id },
        });
        if (!menuItem) {
            throw new common_1.NotFoundException(`Item com ID "${id}" não encontrado`);
        }
        return menuItem;
    }
    async update(id, updateMenuItemDto, userId) {
        const menuItem = await this.findOne(id);
        if (updateMenuItemDto.name &&
            updateMenuItemDto.name !== menuItem.name) {
            const existingItem = await this.menuItemRepository.findOne({
                where: { name: updateMenuItemDto.name },
            });
            if (existingItem) {
                throw new common_1.BadRequestException(`Item com nome "${updateMenuItemDto.name}" já existe no cardápio`);
            }
        }
        if (updateMenuItemDto.price &&
            updateMenuItemDto.price !== menuItem.price) {
            await this.createPriceHistoryEntry(menuItem, updateMenuItemDto.price, userId);
        }
        Object.assign(menuItem, updateMenuItemDto);
        return await this.menuItemRepository.save(menuItem);
    }
    async remove(id) {
        const menuItem = await this.findOne(id);
        await this.menuItemRepository.remove(menuItem);
    }
    async toggleAvailability(id, userId) {
        const menuItem = await this.findOne(id);
        menuItem.isAvailable = !menuItem.isAvailable;
        return await this.menuItemRepository.save(menuItem);
    }
    async getPriceHistory(id) {
        await this.findOne(id);
        return await this.priceHistoryRepository.find({
            where: { menuItemId: id },
            order: { changedAt: 'DESC' },
        });
    }
    async getCategories() {
        const result = await this.menuItemRepository
            .createQueryBuilder('menuItem')
            .select('DISTINCT menuItem.category', 'category')
            .orderBy('menuItem.category', 'ASC')
            .getRawMany();
        return result.map((item) => item.category);
    }
    async createPriceHistoryEntry(menuItem, newPrice, userId) {
        const priceHistory = this.priceHistoryRepository.create({
            menuItemId: menuItem.id,
            oldPrice: menuItem.price,
            newPrice: newPrice,
            changedBy: userId,
        });
        await this.priceHistoryRepository.save(priceHistory);
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.MenuItem)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.PriceHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MenuService);
//# sourceMappingURL=menu.service.js.map