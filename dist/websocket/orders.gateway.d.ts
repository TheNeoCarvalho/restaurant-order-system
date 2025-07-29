import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
    };
}
export declare class OrdersGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
    private readonly jwtService;
    private readonly configService;
    private readonly usersService;
    server: Server;
    private readonly logger;
    private connectedClients;
    private userSessions;
    private cleanupInterval;
    constructor(jwtService: JwtService, configService: ConfigService, usersService: UsersService);
    afterInit(server: Server): void;
    onModuleDestroy(): void;
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): Promise<void>;
    handleJoinRoom(client: AuthenticatedSocket, data: {
        room: string;
    }): Promise<void>;
    handleLeaveRoom(client: AuthenticatedSocket, data: {
        room: string;
    }): Promise<void>;
    notifyNewOrder(order: Order): void;
    notifyOrderItemStatusUpdate(orderItem: OrderItem): void;
    notifyTableStatusUpdate(table: Table): void;
    notifyOrderClosed(order: Order): void;
    private extractTokenFromSocket;
    private validateToken;
    private joinRoleBasedRoom;
    private canJoinRoom;
    private manageUserSession;
    private updateUserSessionOnDisconnect;
    private isReconnection;
    private getSyncDataForUser;
    private getPendingOrdersForKitchen;
    private getActiveOrdersForWaiter;
    private getTableStatuses;
    handleSyncRequest(client: AuthenticatedSocket): Promise<void>;
    handleConflictResolution(client: AuthenticatedSocket, data: {
        resourceType: string;
        resourceId: string;
        clientVersion: number;
        serverVersion: number;
    }): Promise<void>;
    private getLatestResourceData;
    broadcastStateChange(changeType: string, data: any): void;
    getConnectionStats(): any;
    cleanupExpiredSessions(): void;
}
export {};
