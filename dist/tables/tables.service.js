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
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const table_entity_1 = require("./entities/table.entity");
const table_status_enum_1 = require("../common/enums/table-status.enum");
let TablesService = class TablesService {
    tableRepository;
    constructor(tableRepository) {
        this.tableRepository = tableRepository;
    }
    async create(createTableDto) {
        const existingTable = await this.tableRepository.findOne({
            where: { number: createTableDto.number },
        });
        if (existingTable) {
            throw new common_1.ConflictException(`Mesa número ${createTableDto.number} já existe`);
        }
        const table = this.tableRepository.create({
            ...createTableDto,
            capacity: createTableDto.capacity || 4,
        });
        return await this.tableRepository.save(table);
    }
    async findAll() {
        return await this.tableRepository.find({
            order: { number: 'ASC' },
        });
    }
    async findOne(id) {
        const table = await this.tableRepository.findOne({
            where: { id },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Mesa com ID ${id} não encontrada`);
        }
        return table;
    }
    async findByNumber(number) {
        const table = await this.tableRepository.findOne({
            where: { number },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Mesa número ${number} não encontrada`);
        }
        return table;
    }
    async update(id, updateTableDto) {
        const table = await this.findOne(id);
        if (updateTableDto.number && updateTableDto.number !== table.number) {
            const existingTable = await this.tableRepository.findOne({
                where: { number: updateTableDto.number },
            });
            if (existingTable) {
                throw new common_1.ConflictException(`Mesa número ${updateTableDto.number} já existe`);
            }
        }
        Object.assign(table, updateTableDto);
        return await this.tableRepository.save(table);
    }
    async updateStatus(id, updateStatusDto) {
        const table = await this.findOne(id);
        table.status = updateStatusDto.status;
        return await this.tableRepository.save(table);
    }
    async remove(id) {
        const table = await this.findOne(id);
        if (table.status === table_status_enum_1.TableStatus.OCCUPIED) {
            throw new common_1.ConflictException('Não é possível remover uma mesa ocupada');
        }
        await this.tableRepository.remove(table);
    }
    async findAvailable() {
        return await this.tableRepository.find({
            where: { status: table_status_enum_1.TableStatus.AVAILABLE },
            order: { number: 'ASC' },
        });
    }
    async findOccupied() {
        return await this.tableRepository.find({
            where: { status: table_status_enum_1.TableStatus.OCCUPIED },
            order: { number: 'ASC' },
        });
    }
    async checkAvailability(id) {
        const table = await this.findOne(id);
        return table.status === table_status_enum_1.TableStatus.AVAILABLE;
    }
    async getTablesSummary() {
        const [total, available, occupied, reserved, cleaning] = await Promise.all([
            this.tableRepository.count(),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.AVAILABLE } }),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.OCCUPIED } }),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.RESERVED } }),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.CLEANING } }),
        ]);
        return {
            total,
            available,
            occupied,
            reserved,
            cleaning,
        };
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(table_entity_1.Table)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TablesService);
//# sourceMappingURL=tables.service.js.map