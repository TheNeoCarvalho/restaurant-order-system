import { TableStatus } from '../../common/enums/table-status.enum';
export declare class Table {
    id: number;
    number: number;
    capacity: number;
    status: TableStatus;
    createdAt: Date;
    updatedAt: Date;
}
