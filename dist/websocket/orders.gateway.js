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
var OrdersGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let OrdersGateway = OrdersGateway_1 = class OrdersGateway {
    jwtService;
    configService;
    usersService;
    server;
    logger = new common_1.Logger(OrdersGateway_1.name);
    connectedClients = new Map();
    userSessions = new Map();
    cleanupInterval;
    constructor(jwtService, configService, usersService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.usersService = usersService;
    }
    afterInit(server) {
        this.logger.log('OrdersGateway inicializado');
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60000);
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.logger.log('Cleanup interval cleared');
        }
    }
    async handleConnection(client) {
        try {
            const token = this.extractTokenFromSocket(client);
            if (!token) {
                this.logger.warn(`Cliente ${client.id} tentou conectar sem token`);
                client.disconnect();
                return;
            }
            const user = await this.validateToken(token);
            if (!user) {
                this.logger.warn(`Cliente ${client.id} tentou conectar com token inválido`);
                client.disconnect();
                return;
            }
            client.user = user;
            this.connectedClients.set(client.id, client);
            await this.manageUserSession(client, user);
            await this.joinRoleBasedRoom(client);
            this.logger.log(`Cliente ${client.id} conectado como ${user.name} (${user.role})`);
            const syncData = await this.getSyncDataForUser(user);
            client.emit('connected', {
                message: 'Conectado com sucesso',
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                },
                syncData,
                isReconnection: this.isReconnection(user.id),
            });
        }
        catch (error) {
            this.logger.error(`Erro na conexão do cliente ${client.id}:`, error);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        this.connectedClients.delete(client.id);
        if (client.user) {
            this.updateUserSessionOnDisconnect(client.user.id);
            this.logger.log(`Cliente ${client.id} desconectado (${client.user.name} - ${client.user.role})`);
        }
        else {
            this.logger.log(`Cliente ${client.id} desconectado`);
        }
    }
    async handleJoinRoom(client, data) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        const { room } = data;
        if (this.canJoinRoom(client.user.role, room)) {
            await client.join(room);
            this.logger.log(`Cliente ${client.id} (${client.user.name}) entrou na room: ${room}`);
            client.emit('joined-room', { room });
        }
        else {
            this.logger.warn(`Cliente ${client.id} (${client.user.name}) tentou entrar na room não autorizada: ${room}`);
            client.emit('error', {
                message: 'Não autorizado a entrar nesta room',
                room
            });
        }
    }
    async handleLeaveRoom(client, data) {
        const { room } = data;
        await client.leave(room);
        if (client.user) {
            this.logger.log(`Cliente ${client.id} (${client.user.name}) saiu da room: ${room}`);
        }
        client.emit('left-room', { room });
    }
    notifyNewOrder(order) {
        this.logger.log(`Notificando novo pedido: ${order.id} para mesa ${order.table.number}`);
        this.server.to('kitchen').emit('new-order', {
            orderId: order.id,
            tableNumber: order.table.number,
            waiterName: order.waiter.name,
            items: order.items.map(item => ({
                id: item.id,
                menuItemName: item.menuItem.name,
                quantity: item.quantity,
                specialInstructions: item.specialInstructions,
                status: item.status,
            })),
            createdAt: order.createdAt,
        });
    }
    notifyOrderItemStatusUpdate(orderItem) {
        this.logger.log(`Notificando mudança de status do item ${orderItem.id}: ${orderItem.status}`);
        const notification = {
            orderItemId: orderItem.id,
            orderId: orderItem.orderId,
            menuItemName: orderItem.menuItem.name,
            quantity: orderItem.quantity,
            status: orderItem.status,
            updatedBy: orderItem.statusUpdatedBy?.name,
            updatedAt: orderItem.updatedAt,
        };
        this.server.to('waiters').emit('order-item-status-updated', notification);
        if (orderItem.status === 'cancelled') {
            this.server.to('kitchen').emit('order-item-cancelled', notification);
        }
        this.server.to('admins').emit('order-item-status-updated', notification);
    }
    notifyTableStatusUpdate(table) {
        this.logger.log(`Notificando mudança de status da mesa ${table.number}: ${table.status}`);
        const notification = {
            tableId: table.id,
            tableNumber: table.number,
            status: table.status,
            capacity: table.capacity,
            updatedAt: table.updatedAt,
        };
        this.server.emit('table-status-updated', notification);
    }
    notifyOrderClosed(order) {
        this.logger.log(`Notificando fechamento da comanda ${order.id} da mesa ${order.table.number}`);
        const notification = {
            orderId: order.id,
            tableNumber: order.table.number,
            totalAmount: order.totalAmount,
            closedAt: order.closedAt,
            waiterName: order.waiter.name,
        };
        this.server.to('waiters').emit('order-closed', notification);
        this.server.to('admins').emit('order-closed', notification);
    }
    extractTokenFromSocket(client) {
        const token = client.handshake.auth?.token ||
            client.handshake.headers?.authorization?.replace('Bearer ', '');
        return token || null;
    }
    async validateToken(token) {
        try {
            const secret = this.configService.get('JWT_SECRET') || 'your-secret-key';
            const payload = this.jwtService.verify(token, { secret });
            const user = await this.usersService.findById(payload.sub);
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Usuário não encontrado ou inativo');
            }
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };
        }
        catch (error) {
            this.logger.error('Erro na validação do token:', error);
            return null;
        }
    }
    async joinRoleBasedRoom(client) {
        if (!client.user)
            return;
        const roleRoomMap = {
            [user_role_enum_1.UserRole.ADMIN]: 'admins',
            [user_role_enum_1.UserRole.WAITER]: 'waiters',
            [user_role_enum_1.UserRole.KITCHEN]: 'kitchen',
        };
        const room = roleRoomMap[client.user.role];
        if (room) {
            await client.join(room);
            this.logger.log(`Cliente ${client.id} adicionado à room: ${room}`);
        }
    }
    canJoinRoom(userRole, room) {
        const rolePermissions = {
            [user_role_enum_1.UserRole.ADMIN]: ['admins', 'waiters', 'kitchen', 'general'],
            [user_role_enum_1.UserRole.WAITER]: ['waiters', 'general'],
            [user_role_enum_1.UserRole.KITCHEN]: ['kitchen', 'general'],
        };
        return rolePermissions[userRole]?.includes(room) || false;
    }
    async manageUserSession(client, user) {
        const existingSession = this.userSessions.get(user.id);
        if (existingSession) {
            existingSession.socketId = client.id;
            existingSession.lastSeen = new Date();
            existingSession.connectionCount++;
            this.logger.log(`Usuário ${user.name} reconectou (conexão #${existingSession.connectionCount})`);
        }
        else {
            this.userSessions.set(user.id, {
                socketId: client.id,
                lastSeen: new Date(),
                rooms: [],
                connectionCount: 1,
            });
            this.logger.log(`Nova sessão criada para usuário ${user.name}`);
        }
    }
    updateUserSessionOnDisconnect(userId) {
        const session = this.userSessions.get(userId);
        if (session) {
            session.lastSeen = new Date();
            setTimeout(() => {
                const currentSession = this.userSessions.get(userId);
                if (currentSession && currentSession.lastSeen === session.lastSeen) {
                    this.userSessions.delete(userId);
                    this.logger.log(`Sessão expirada para usuário ${userId}`);
                }
            }, 30000);
        }
    }
    isReconnection(userId) {
        const session = this.userSessions.get(userId);
        return session ? session.connectionCount > 1 : false;
    }
    async getSyncDataForUser(user) {
        const syncData = {
            timestamp: new Date().toISOString(),
            serverTime: Date.now(),
        };
        switch (user.role) {
            case user_role_enum_1.UserRole.KITCHEN:
                syncData.pendingOrders = await this.getPendingOrdersForKitchen();
                break;
            case user_role_enum_1.UserRole.WAITER:
                syncData.activeOrders = await this.getActiveOrdersForWaiter();
                syncData.tableStatuses = await this.getTableStatuses();
                break;
            case user_role_enum_1.UserRole.ADMIN:
                syncData.activeOrders = await this.getActiveOrdersForWaiter();
                syncData.tableStatuses = await this.getTableStatuses();
                syncData.pendingOrders = await this.getPendingOrdersForKitchen();
                syncData.systemStats = this.getConnectionStats();
                break;
        }
        return syncData;
    }
    async getPendingOrdersForKitchen() {
        return [
            {
                orderId: 'mock-order-1',
                tableNumber: 5,
                items: [
                    {
                        id: 'item-1',
                        name: 'Pizza Margherita',
                        quantity: 2,
                        status: 'pending',
                        specialInstructions: 'Extra cheese',
                    },
                ],
                createdAt: new Date().toISOString(),
            },
        ];
    }
    async getActiveOrdersForWaiter() {
        return [
            {
                orderId: 'mock-order-1',
                tableNumber: 5,
                status: 'open',
                totalAmount: 45.99,
                itemsCount: 3,
                createdAt: new Date().toISOString(),
            },
        ];
    }
    async getTableStatuses() {
        return [
            { id: 1, number: 1, status: 'available', capacity: 4 },
            { id: 2, number: 2, status: 'occupied', capacity: 2 },
            { id: 3, number: 3, status: 'cleaning', capacity: 6 },
        ];
    }
    async handleSyncRequest(client) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        this.logger.log(`Solicitação de sincronização do cliente ${client.id}`);
        const syncData = await this.getSyncDataForUser(client.user);
        client.emit('sync-data', syncData);
    }
    async handleConflictResolution(client, data) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        const { resourceType, resourceId, clientVersion, serverVersion } = data;
        this.logger.log(`Resolvendo conflito para ${resourceType}:${resourceId} - Cliente: v${clientVersion}, Servidor: v${serverVersion}`);
        if (serverVersion > clientVersion) {
            const latestData = await this.getLatestResourceData(resourceType, resourceId);
            client.emit('conflict-resolved', {
                resourceType,
                resourceId,
                resolution: 'server-wins',
                data: latestData,
                version: serverVersion,
            });
        }
        else {
            client.emit('conflict-resolved', {
                resourceType,
                resourceId,
                resolution: 'client-wins',
                message: 'Envie seus dados mais recentes',
            });
        }
    }
    async getLatestResourceData(resourceType, resourceId) {
        switch (resourceType) {
            case 'order':
                return { id: resourceId, status: 'updated', timestamp: new Date() };
            case 'table':
                return { id: resourceId, status: 'available', timestamp: new Date() };
            default:
                return null;
        }
    }
    broadcastStateChange(changeType, data) {
        this.logger.log(`Broadcasting state change: ${changeType}`);
        this.server.emit('state-change', {
            type: changeType,
            data,
            timestamp: new Date().toISOString(),
            version: Date.now(),
        });
    }
    getConnectionStats() {
        const stats = {
            totalConnections: this.connectedClients.size,
            totalSessions: this.userSessions.size,
            usersByRole: {
                [user_role_enum_1.UserRole.ADMIN]: 0,
                [user_role_enum_1.UserRole.WAITER]: 0,
                [user_role_enum_1.UserRole.KITCHEN]: 0,
            },
            reconnections: 0,
        };
        this.connectedClients.forEach(client => {
            if (client.user) {
                stats.usersByRole[client.user.role]++;
            }
        });
        this.userSessions.forEach(session => {
            if (session.connectionCount > 1) {
                stats.reconnections++;
            }
        });
        return stats;
    }
    cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];
        this.userSessions.forEach((session, userId) => {
            const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
            if (timeSinceLastSeen > 300000) {
                expiredSessions.push(userId);
            }
        });
        expiredSessions.forEach(userId => {
            this.userSessions.delete(userId);
            this.logger.log(`Sessão expirada removida para usuário ${userId}`);
        });
        if (expiredSessions.length > 0) {
            this.logger.log(`Limpeza concluída: ${expiredSessions.length} sessões removidas`);
        }
    }
};
exports.OrdersGateway = OrdersGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], OrdersGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('request-sync'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleSyncRequest", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('resolve-conflict'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleConflictResolution", null);
exports.OrdersGateway = OrdersGateway = OrdersGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/orders',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        users_service_1.UsersService])
], OrdersGateway);
//# sourceMappingURL=orders.gateway.js.map