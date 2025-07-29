import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto';
import { OrdersGateway } from '../websocket/orders.gateway';
export declare class TablesService {
    private readonly tableRepository;
    private readonly ordersGateway;
    constructor(tableRepository: Repository<Table>, ordersGateway: OrdersGateway);
    create(createTableDto: CreateTableDto): Promise<Table>;
    findAll(): Promise<Table[]>;
    findOne(id: number): Promise<Table>;
    findByNumber(number: number): Promise<Table>;
    update(id: number, updateTableDto: UpdateTableDto): Promise<Table>;
    updateStatus(id: number, updateStatusDto: UpdateTableStatusDto): Promise<Table>;
    remove(id: number): Promise<void>;
    findAvailable(): Promise<Table[]>;
    findOccupied(): Promise<Table[]>;
    checkAvailability(id: number): Promise<boolean>;
    getTablesSummary(): Promise<{
        total: number;
        available: number;
        occupied: number;
        reserved: number;
        cleaning: number;
    }>;
}
