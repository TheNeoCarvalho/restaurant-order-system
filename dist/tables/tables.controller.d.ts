import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto';
import { Table } from './entities/table.entity';
import { User } from '../users/entities/user.entity';
export declare class TablesController {
    private readonly tablesService;
    constructor(tablesService: TablesService);
    create(createTableDto: CreateTableDto, user: User): Promise<Table>;
    findAll(user: User): Promise<Table[]>;
    findAvailable(user: User): Promise<Table[]>;
    findOccupied(user: User): Promise<Table[]>;
    getTablesSummary(user: User): Promise<{
        total: number;
        available: number;
        occupied: number;
        reserved: number;
        cleaning: number;
    }>;
    findOne(id: number, user: User): Promise<Table>;
    checkAvailability(id: number, user: User): Promise<{
        available: boolean;
    }>;
    update(id: number, updateTableDto: UpdateTableDto, user: User): Promise<Table>;
    updateStatus(id: number, updateStatusDto: UpdateTableStatusDto, user: User): Promise<Table>;
    remove(id: number, user: User): Promise<void>;
}
