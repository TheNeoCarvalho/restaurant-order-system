import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
export declare class TablesController {
    findAll(user: User): Promise<{
        message: string;
        requestedBy: {
            id: string;
            name: string;
            role: UserRole;
        };
        tables: {
            id: number;
            number: number;
            capacity: number;
            status: string;
        }[];
    }>;
    create(createTableDto: any, user: User): Promise<{
        message: string;
        createdBy: {
            id: string;
            name: string;
            role: UserRole;
        };
        table: any;
    }>;
    findOne(id: string, user: User): Promise<{
        message: string;
        requestedBy: {
            id: string;
            name: string;
            role: UserRole;
        };
        table: {
            id: number;
            number: number;
            capacity: number;
            status: string;
        };
    }>;
    update(id: string, updateTableDto: any, user: User): Promise<{
        message: string;
        updatedBy: {
            id: string;
            name: string;
            role: UserRole;
        };
        table: any;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
        deletedBy: {
            id: string;
            name: string;
            role: UserRole;
        };
    }>;
    updateStatus(id: string, statusDto: {
        status: string;
    }, user: User): Promise<{
        message: string;
        updatedBy: {
            id: string;
            name: string;
            role: UserRole;
        };
        table: {
            id: number;
            status: string;
        };
    }>;
    getTablesWithOrders(user: User): Promise<{
        message: string;
        requestedBy: {
            id: string;
            name: string;
            role: UserRole;
        };
        tables: {
            id: number;
            number: number;
            status: string;
            pendingOrders: {
                id: number;
                item: string;
                status: string;
            }[];
        }[];
    }>;
}
