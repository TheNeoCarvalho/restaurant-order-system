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
    lastHeartbeat?: Date;
    reconnectAttempts?: number;
    connectionId?: string;
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
    private heartbeatInterval;
    private stateVersions;
    private pendingConflicts;
    private messageQueue;
    private readonly HEARTBEAT_INTERVAL;
    private readonly RECONNECT_TIMEOUT;
    private readonly MAX_PENDING_MESSAGES;
    private readonly MAX_RECONNECT_ATTEMPTS;
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
    notifyTableOverviewUpdate(): void;
    notifyTableOrderUpdate(tableId: number, orderData: any): void;
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
    handleTablesOverviewRequest(client: AuthenticatedSocket, data: {
        filters?: {
            status?: string;
            hasPendingOrders?: boolean;
            sortBy?: string;
            sortOrder?: 'ASC' | 'DESC';
        };
    }): Promise<void>;
    handleJoinTablesOverview(client: AuthenticatedSocket): Promise<void>;
    handleLeaveTablesOverview(client: AuthenticatedSocket): Promise<void>;
    handleSyncRequest(client: AuthenticatedSocket): Promise<void>;
    handleConflictResolution(client: AuthenticatedSocket, data: {
        resourceType: string;
        resourceId: string;
        clientVersion: number;
        clientData?: any;
        conflictStrategy?: 'server-wins' | 'client-wins' | 'merge';
    }): Promise<void>;
    handleVersionCheck(client: AuthenticatedSocket, data: {
        resourceType: string;
        resourceId: string;
        clientVersion: number;
    }): Promise<void>;
    handleFullSyncRequest(client: AuthenticatedSocket, data: {
        lastSyncVersion?: number;
        resources?: string[];
    }): Promise<void>;
    handleMessageAcknowledgment(client: AuthenticatedSocket, data: {
        messageId: string;
        status: 'received' | 'processed' | 'error';
        error?: string;
    }): Promise<void>;
    handleConnectivityStatus(client: AuthenticatedSocket, data: {
        status: 'stable' | 'unstable' | 'poor';
        latency?: number;
        reconnectAttempts?: number;
    }): Promise<void>;
    private getLatestResourceData;
    private applyClientData;
    private mergeConflictingData;
    private mergeOrderData;
    private mergeTableData;
    private mergeOrderItemData;
    private getMostAdvancedOrderStatus;
    private getMostAdvancedOrderItemStatus;
    private mergeOrderItems;
    private getFullSyncData;
    private getResourceDataForSync;
    broadcastStateChange(changeType: string, data: any): void;
    private queueChangeForOfflineUsers;
    private getRelevantRolesForChange;
    private getMessagePriority;
    broadcastWithAck(changeType: string, data: any, targetRoles?: UserRole[]): void;
    private getRoomNameForRole;
    private handleMissingAck;
    getConnectionStats(): any;
    cleanupExpiredSessions(): void;
    private setupServerEvents;
    private generateConnectionId;
    private processPendingMessages;
    private queueMessageForUser;
    private performHeartbeatCheck;
    private handleUnexpectedDisconnect;
    private cleanupUserSession;
    private updateStateVersion;
    private getStateVersion;
    private hasVersionConflict;
}
export {};
