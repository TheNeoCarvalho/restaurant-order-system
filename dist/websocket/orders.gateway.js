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
    heartbeatInterval;
    stateVersions = new Map();
    pendingConflicts = new Map();
    messageQueue = new Map();
    HEARTBEAT_INTERVAL = 30000;
    RECONNECT_TIMEOUT = 60000;
    MAX_PENDING_MESSAGES = 100;
    MAX_RECONNECT_ATTEMPTS = 5;
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
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeatCheck();
        }, this.HEARTBEAT_INTERVAL);
        this.setupServerEvents();
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.logger.log('Cleanup interval cleared');
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.logger.log('Heartbeat interval cleared');
        }
        this.server.emit('server-shutdown', {
            message: 'Servidor será reiniciado em breve',
            timestamp: new Date().toISOString(),
        });
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
            client.connectionId = this.generateConnectionId();
            client.lastHeartbeat = new Date();
            client.reconnectAttempts = 0;
            const isReconnection = await this.manageUserSession(client, user);
            await this.joinRoleBasedRoom(client);
            this.logger.log(`Cliente ${client.id} conectado como ${user.name} (${user.role}) - ${isReconnection ? 'Reconexão' : 'Nova conexão'}`);
            if (isReconnection) {
                await this.processPendingMessages(user.id, client);
            }
            const syncData = await this.getSyncDataForUser(user);
            client.emit('connected', {
                message: 'Conectado com sucesso',
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                },
                syncData,
                isReconnection,
                connectionId: client.connectionId,
                serverTime: Date.now(),
                heartbeatInterval: this.HEARTBEAT_INTERVAL,
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
        const version = this.updateStateVersion('order', order.id, order.waiter.id);
        const orderData = {
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
            version,
        };
        this.broadcastWithAck('order-created', orderData, [user_role_enum_1.UserRole.KITCHEN, user_role_enum_1.UserRole.ADMIN]);
        this.server.to('kitchen').emit('new-order', orderData);
    }
    notifyOrderItemStatusUpdate(orderItem) {
        this.logger.log(`Notificando mudança de status do item ${orderItem.id}: ${orderItem.status}`);
        const version = this.updateStateVersion('order-item', orderItem.id, orderItem.statusUpdatedBy?.id || 'system');
        const notification = {
            orderItemId: orderItem.id,
            orderId: orderItem.orderId,
            menuItemName: orderItem.menuItem.name,
            quantity: orderItem.quantity,
            status: orderItem.status,
            updatedBy: orderItem.statusUpdatedBy?.name,
            updatedAt: orderItem.updatedAt,
            version,
        };
        this.broadcastStateChange('order-item-status-updated', notification);
        this.server.to('waiters').emit('order-item-status-updated', notification);
        if (orderItem.status === 'cancelled') {
            this.server.to('kitchen').emit('order-item-cancelled', notification);
        }
        this.server.to('admins').emit('order-item-status-updated', notification);
    }
    notifyTableStatusUpdate(table) {
        this.logger.log(`Notificando mudança de status da mesa ${table.number}: ${table.status}`);
        const version = this.updateStateVersion('table', table.id.toString(), 'system');
        const notification = {
            tableId: table.id,
            tableNumber: table.number,
            status: table.status,
            capacity: table.capacity,
            updatedAt: table.updatedAt,
            version,
        };
        this.broadcastStateChange('table-status-updated', notification);
        this.server.emit('table-status-updated', notification);
        this.notifyTableOverviewUpdate();
    }
    notifyTableOverviewUpdate() {
        this.logger.log('Notificando atualização do painel geral de mesas');
        this.server.emit('tables-overview-update', {
            timestamp: new Date().toISOString(),
            message: 'Painel de mesas atualizado',
        });
        this.server.to('tables-overview').emit('tables-overview-refresh', {
            timestamp: new Date().toISOString(),
            message: 'Dados do painel atualizados - refresh necessário',
        });
    }
    notifyTableOrderUpdate(tableId, orderData) {
        this.logger.log(`Notificando atualização de pedido para mesa ${tableId}`);
        const notification = {
            tableId,
            orderData,
            timestamp: new Date().toISOString(),
        };
        this.server.emit('table-order-updated', notification);
        this.notifyTableOverviewUpdate();
    }
    notifyOrderClosed(order) {
        this.logger.log(`Notificando fechamento da comanda ${order.id} da mesa ${order.table.number}`);
        const version = this.updateStateVersion('order', order.id, order.waiter.id);
        const notification = {
            orderId: order.id,
            tableNumber: order.table.number,
            totalAmount: order.totalAmount,
            closedAt: order.closedAt,
            waiterName: order.waiter.name,
            version,
        };
        this.broadcastStateChange('order-closed', notification);
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
            const wasOffline = !existingSession.isOnline;
            existingSession.socketId = client.id;
            existingSession.lastSeen = new Date();
            existingSession.connectionCount++;
            existingSession.connectionId = client.connectionId;
            existingSession.isOnline = true;
            this.logger.log(`Usuário ${user.name} reconectou (conexão #${existingSession.connectionCount}) - ${wasOffline ? 'Estava offline' : 'Troca de conexão'}`);
            return true;
        }
        else {
            this.userSessions.set(user.id, {
                socketId: client.id,
                lastSeen: new Date(),
                rooms: [],
                connectionCount: 1,
                connectionId: client.connectionId,
                isOnline: true,
                pendingMessages: [],
                lastSyncVersion: Date.now(),
            });
            this.logger.log(`Nova sessão criada para usuário ${user.name}`);
            return false;
        }
    }
    updateUserSessionOnDisconnect(userId) {
        const session = this.userSessions.get(userId);
        if (session) {
            session.lastSeen = new Date();
            session.isOnline = false;
            setTimeout(() => {
                const currentSession = this.userSessions.get(userId);
                if (currentSession && !currentSession.isOnline && currentSession.lastSeen === session.lastSeen) {
                    this.cleanupUserSession(userId);
                }
            }, this.RECONNECT_TIMEOUT);
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
    async handleTablesOverviewRequest(client, data) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        try {
            this.logger.log(`Solicitação de overview de mesas do cliente ${client.id}`);
            const mockTablesOverview = [
                {
                    id: 1,
                    number: 1,
                    capacity: 4,
                    status: 'available',
                    hasPendingOrders: false,
                    priority: 'low',
                },
                {
                    id: 2,
                    number: 2,
                    capacity: 2,
                    status: 'occupied',
                    activeOrderId: 'order-123',
                    waiterName: 'João Silva',
                    orderTotal: 45.99,
                    totalItems: 3,
                    pendingItems: 1,
                    itemsInPreparation: 1,
                    readyItems: 1,
                    orderDurationMinutes: 25,
                    hasPendingOrders: true,
                    priority: 'medium',
                },
            ];
            client.emit('tables-overview-data', {
                tables: mockTablesOverview,
                timestamp: new Date().toISOString(),
                filters: data.filters,
            });
        }
        catch (error) {
            this.logger.error(`Erro ao buscar overview de mesas para cliente ${client.id}:`, error);
            client.emit('tables-overview-error', {
                message: 'Erro ao buscar dados das mesas',
                error: error.message,
            });
        }
    }
    async handleJoinTablesOverview(client) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        await client.join('tables-overview');
        this.logger.log(`Cliente ${client.id} (${client.user.name}) entrou na room tables-overview`);
        client.emit('joined-tables-overview', {
            message: 'Conectado ao painel de mesas em tempo real',
            timestamp: new Date().toISOString(),
        });
    }
    async handleLeaveTablesOverview(client) {
        await client.leave('tables-overview');
        if (client.user) {
            this.logger.log(`Cliente ${client.id} (${client.user.name}) saiu da room tables-overview`);
        }
        client.emit('left-tables-overview', {
            message: 'Desconectado do painel de mesas',
            timestamp: new Date().toISOString(),
        });
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
        const { resourceType, resourceId, clientVersion, clientData, conflictStrategy = 'server-wins' } = data;
        const serverVersion = this.getStateVersion(resourceType, resourceId);
        this.logger.log(`Resolvendo conflito para ${resourceType}:${resourceId} - Cliente: v${clientVersion}, Servidor: v${serverVersion}, Estratégia: ${conflictStrategy}`);
        const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            let resolution;
            switch (conflictStrategy) {
                case 'server-wins':
                    const latestData = await this.getLatestResourceData(resourceType, resourceId);
                    resolution = {
                        strategy: 'server-wins',
                        data: latestData,
                        conflictId,
                    };
                    break;
                case 'client-wins':
                    if (clientData) {
                        await this.applyClientData(resourceType, resourceId, clientData, client.user.id);
                        const newVersion = this.updateStateVersion(resourceType, resourceId, client.user.id);
                        resolution = {
                            strategy: 'client-wins',
                            data: clientData,
                            conflictId,
                        };
                        this.broadcastStateChange(`${resourceType}-updated`, {
                            resourceType,
                            resourceId,
                            data: clientData,
                            version: newVersion,
                            updatedBy: client.user.name,
                        });
                    }
                    else {
                        throw new Error('Dados do cliente não fornecidos para estratégia client-wins');
                    }
                    break;
                case 'merge':
                    const serverData = await this.getLatestResourceData(resourceType, resourceId);
                    const mergedData = await this.mergeConflictingData(serverData, clientData, resourceType);
                    await this.applyClientData(resourceType, resourceId, mergedData, client.user.id);
                    const mergedVersion = this.updateStateVersion(resourceType, resourceId, client.user.id);
                    resolution = {
                        strategy: 'merge',
                        data: mergedData,
                        conflictId,
                    };
                    this.broadcastStateChange(`${resourceType}-merged`, {
                        resourceType,
                        resourceId,
                        data: mergedData,
                        version: mergedVersion,
                        updatedBy: client.user.name,
                    });
                    break;
                default:
                    throw new Error(`Estratégia de conflito não suportada: ${conflictStrategy}`);
            }
            client.emit('conflict-resolved', {
                ...resolution,
                serverVersion: this.getStateVersion(resourceType, resourceId),
                timestamp: new Date().toISOString(),
            });
            this.logger.log(`Conflito ${conflictId} resolvido com estratégia: ${resolution.strategy}`);
        }
        catch (error) {
            this.logger.error(`Erro ao resolver conflito ${conflictId}:`, error);
            client.emit('conflict-resolution-failed', {
                conflictId,
                error: error.message,
                resourceType,
                resourceId,
            });
        }
    }
    async handleVersionCheck(client, data) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        const { resourceType, resourceId, clientVersion } = data;
        const serverVersion = this.getStateVersion(resourceType, resourceId);
        const hasConflict = this.hasVersionConflict(resourceType, resourceId, clientVersion);
        client.emit('version-check-result', {
            resourceType,
            resourceId,
            clientVersion,
            serverVersion,
            hasConflict,
            timestamp: new Date().toISOString(),
        });
        if (hasConflict) {
            this.logger.log(`Conflito de versão detectado para ${resourceType}:${resourceId} - Cliente: v${clientVersion}, Servidor: v${serverVersion}`);
        }
    }
    async handleFullSyncRequest(client, data) {
        if (!client.user) {
            client.emit('error', { message: 'Usuário não autenticado' });
            return;
        }
        const { lastSyncVersion = 0, resources = [] } = data;
        this.logger.log(`Sincronização completa solicitada pelo cliente ${client.id} - Última versão: ${lastSyncVersion}`);
        try {
            const syncData = await this.getFullSyncData(client.user, lastSyncVersion, resources);
            const session = this.userSessions.get(client.user.id);
            if (session) {
                session.lastSyncVersion = Date.now();
            }
            client.emit('full-sync-data', {
                ...syncData,
                syncVersion: Date.now(),
                timestamp: new Date().toISOString(),
            });
            this.logger.log(`Sincronização completa enviada para cliente ${client.id}`);
        }
        catch (error) {
            this.logger.error(`Erro na sincronização completa para cliente ${client.id}:`, error);
            client.emit('sync-error', {
                message: 'Erro na sincronização completa',
                error: error.message,
            });
        }
    }
    async handleMessageAcknowledgment(client, data) {
        const { messageId, status, error } = data;
        this.logger.debug(`ACK recebido do cliente ${client.id} para mensagem ${messageId}: ${status}`);
        if (status === 'error') {
            this.logger.error(`Erro no processamento da mensagem ${messageId} pelo cliente ${client.id}: ${error}`);
        }
    }
    async handleConnectivityStatus(client, data) {
        if (!client.user)
            return;
        const { status, latency, reconnectAttempts } = data;
        this.logger.debug(`Status de conectividade do cliente ${client.id}: ${status} (latência: ${latency}ms, tentativas: ${reconnectAttempts})`);
        if (status === 'poor' || (latency && latency > 1000)) {
            client.emit('adjust-update-frequency', {
                heartbeatInterval: this.HEARTBEAT_INTERVAL * 2,
                batchUpdates: true,
                reducedData: true,
            });
        }
        const session = this.userSessions.get(client.user.id);
        if (session) {
            session.connectivityStatus = status;
            session.latency = latency;
            session.reconnectAttempts = reconnectAttempts;
        }
    }
    async getLatestResourceData(resourceType, resourceId) {
        switch (resourceType) {
            case 'order':
                return {
                    id: resourceId,
                    status: 'updated',
                    timestamp: new Date(),
                    version: this.getStateVersion(resourceType, resourceId),
                };
            case 'table':
                return {
                    id: resourceId,
                    status: 'available',
                    timestamp: new Date(),
                    version: this.getStateVersion(resourceType, resourceId),
                };
            case 'order-item':
                return {
                    id: resourceId,
                    status: 'ready',
                    timestamp: new Date(),
                    version: this.getStateVersion(resourceType, resourceId),
                };
            default:
                return null;
        }
    }
    async applyClientData(resourceType, resourceId, data, userId) {
        this.logger.log(`Aplicando dados do cliente para ${resourceType}:${resourceId} por usuário ${userId}`);
        switch (resourceType) {
            case 'order':
                break;
            case 'table':
                break;
            case 'order-item':
                break;
            default:
                throw new Error(`Tipo de recurso não suportado: ${resourceType}`);
        }
    }
    async mergeConflictingData(serverData, clientData, resourceType) {
        this.logger.log(`Mesclando dados conflitantes para tipo: ${resourceType}`);
        switch (resourceType) {
            case 'order':
                return this.mergeOrderData(serverData, clientData);
            case 'table':
                return this.mergeTableData(serverData, clientData);
            case 'order-item':
                return this.mergeOrderItemData(serverData, clientData);
            default:
                return {
                    ...serverData,
                    ...clientData,
                    mergedAt: new Date().toISOString(),
                    mergeStrategy: 'client-priority',
                };
        }
    }
    mergeOrderData(serverData, clientData) {
        return {
            ...serverData,
            status: this.getMostAdvancedOrderStatus(serverData.status, clientData.status),
            totalAmount: Math.max(serverData.totalAmount || 0, clientData.totalAmount || 0),
            items: this.mergeOrderItems(serverData.items || [], clientData.items || []),
            mergedAt: new Date().toISOString(),
            mergeStrategy: 'order-specific',
        };
    }
    mergeTableData(serverData, clientData) {
        return {
            ...serverData,
            status: serverData.status,
            capacity: serverData.capacity,
            updatedAt: new Date(Math.max(new Date(serverData.updatedAt || 0).getTime(), new Date(clientData.updatedAt || 0).getTime())).toISOString(),
            mergedAt: new Date().toISOString(),
            mergeStrategy: 'server-priority',
        };
    }
    mergeOrderItemData(serverData, clientData) {
        return {
            ...serverData,
            status: this.getMostAdvancedOrderItemStatus(serverData.status, clientData.status),
            specialInstructions: clientData.specialInstructions || serverData.specialInstructions,
            updatedAt: new Date(Math.max(new Date(serverData.updatedAt || 0).getTime(), new Date(clientData.updatedAt || 0).getTime())).toISOString(),
            mergedAt: new Date().toISOString(),
            mergeStrategy: 'status-priority',
        };
    }
    getMostAdvancedOrderStatus(status1, status2) {
        const statusOrder = ['open', 'closed', 'cancelled'];
        const index1 = statusOrder.indexOf(status1);
        const index2 = statusOrder.indexOf(status2);
        return index1 > index2 ? status1 : status2;
    }
    getMostAdvancedOrderItemStatus(status1, status2) {
        const statusOrder = ['pending', 'in_preparation', 'ready', 'delivered', 'cancelled'];
        const index1 = statusOrder.indexOf(status1);
        const index2 = statusOrder.indexOf(status2);
        return index1 > index2 ? status1 : status2;
    }
    mergeOrderItems(serverItems, clientItems) {
        const itemsMap = new Map();
        serverItems.forEach(item => {
            itemsMap.set(item.id, item);
        });
        clientItems.forEach(clientItem => {
            const serverItem = itemsMap.get(clientItem.id);
            if (serverItem) {
                itemsMap.set(clientItem.id, this.mergeOrderItemData(serverItem, clientItem));
            }
            else {
                itemsMap.set(clientItem.id, clientItem);
            }
        });
        return Array.from(itemsMap.values());
    }
    async getFullSyncData(user, lastSyncVersion, resources) {
        const syncData = {
            timestamp: new Date().toISOString(),
            serverTime: Date.now(),
            syncVersion: Date.now(),
            resources: {},
        };
        if (resources.length === 0) {
            switch (user.role) {
                case user_role_enum_1.UserRole.KITCHEN:
                    resources = ['orders', 'order-items'];
                    break;
                case user_role_enum_1.UserRole.WAITER:
                    resources = ['orders', 'tables', 'order-items'];
                    break;
                case user_role_enum_1.UserRole.ADMIN:
                    resources = ['orders', 'tables', 'order-items', 'menu-items', 'users'];
                    break;
            }
        }
        for (const resource of resources) {
            try {
                syncData.resources[resource] = await this.getResourceDataForSync(resource, user, lastSyncVersion);
            }
            catch (error) {
                this.logger.error(`Erro ao obter dados de sincronização para ${resource}:`, error);
                syncData.resources[resource] = { error: error.message };
            }
        }
        return syncData;
    }
    async getResourceDataForSync(resource, user, lastSyncVersion) {
        switch (resource) {
            case 'orders':
                return {
                    data: await this.getActiveOrdersForWaiter(),
                    version: Date.now(),
                    lastModified: new Date().toISOString(),
                };
            case 'tables':
                return {
                    data: await this.getTableStatuses(),
                    version: Date.now(),
                    lastModified: new Date().toISOString(),
                };
            case 'order-items':
                return {
                    data: await this.getPendingOrdersForKitchen(),
                    version: Date.now(),
                    lastModified: new Date().toISOString(),
                };
            default:
                return {
                    data: [],
                    version: Date.now(),
                    lastModified: new Date().toISOString(),
                };
        }
    }
    broadcastStateChange(changeType, data) {
        this.logger.log(`Broadcasting state change: ${changeType}`);
        const changeData = {
            type: changeType,
            data,
            timestamp: new Date().toISOString(),
            version: Date.now(),
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        this.server.emit('state-change', changeData);
        this.queueChangeForOfflineUsers(changeType, changeData);
    }
    queueChangeForOfflineUsers(changeType, changeData) {
        const relevantRoles = this.getRelevantRolesForChange(changeType);
        this.userSessions.forEach((session, userId) => {
            if (!session.isOnline) {
                const client = this.connectedClients.get(session.socketId);
                if (client?.user && relevantRoles.includes(client.user.role)) {
                    const priority = this.getMessagePriority(changeType);
                    this.queueMessageForUser(userId, 'state-change', changeData, priority);
                }
            }
        });
    }
    getRelevantRolesForChange(changeType) {
        const roleMap = {
            'order-created': [user_role_enum_1.UserRole.KITCHEN, user_role_enum_1.UserRole.ADMIN],
            'order-updated': [user_role_enum_1.UserRole.WAITER, user_role_enum_1.UserRole.ADMIN],
            'order-item-status-updated': [user_role_enum_1.UserRole.WAITER, user_role_enum_1.UserRole.ADMIN],
            'table-status-updated': [user_role_enum_1.UserRole.WAITER, user_role_enum_1.UserRole.ADMIN],
            'menu-item-updated': [user_role_enum_1.UserRole.WAITER, user_role_enum_1.UserRole.ADMIN],
            'user-connected': [user_role_enum_1.UserRole.ADMIN],
            'user-disconnected': [user_role_enum_1.UserRole.ADMIN],
        };
        return roleMap[changeType] || [user_role_enum_1.UserRole.ADMIN];
    }
    getMessagePriority(changeType) {
        const priorityMap = {
            'order-created': 'high',
            'order-item-status-updated': 'high',
            'table-status-updated': 'medium',
            'order-updated': 'medium',
            'menu-item-updated': 'low',
            'user-connected': 'low',
            'user-disconnected': 'low',
        };
        return priorityMap[changeType] || 'medium';
    }
    broadcastWithAck(changeType, data, targetRoles) {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const changeData = {
            type: changeType,
            data,
            timestamp: new Date().toISOString(),
            version: Date.now(),
            messageId,
            requiresAck: true,
        };
        this.logger.log(`Broadcasting with ACK: ${changeType} (${messageId})`);
        if (targetRoles) {
            targetRoles.forEach(role => {
                const roomName = this.getRoomNameForRole(role);
                this.server.to(roomName).emit('state-change', changeData);
            });
        }
        else {
            this.server.emit('state-change', changeData);
        }
        setTimeout(() => {
            this.handleMissingAck(messageId, changeType);
        }, 10000);
    }
    getRoomNameForRole(role) {
        const roleRoomMap = {
            [user_role_enum_1.UserRole.ADMIN]: 'admins',
            [user_role_enum_1.UserRole.WAITER]: 'waiters',
            [user_role_enum_1.UserRole.KITCHEN]: 'kitchen',
        };
        return roleRoomMap[role];
    }
    handleMissingAck(messageId, changeType) {
        this.logger.warn(`ACK não recebido para mensagem ${messageId} (${changeType})`);
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
            this.cleanupUserSession(userId);
        });
        if (expiredSessions.length > 0) {
            this.logger.log(`Limpeza concluída: ${expiredSessions.length} sessões removidas`);
        }
    }
    setupServerEvents() {
        this.server.on('connection', (socket) => {
            socket.on('ping', () => {
                socket.lastHeartbeat = new Date();
                socket.emit('pong', { timestamp: Date.now() });
            });
            socket.on('disconnect', (reason) => {
                this.logger.log(`Cliente ${socket.id} desconectado: ${reason}`);
                if (reason === 'transport close' || reason === 'transport error') {
                    this.handleUnexpectedDisconnect(socket);
                }
            });
        });
    }
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async processPendingMessages(userId, client) {
        const session = this.userSessions.get(userId);
        if (!session || session.pendingMessages.length === 0) {
            return;
        }
        this.logger.log(`Processando ${session.pendingMessages.length} mensagens pendentes para usuário ${userId}`);
        const sortedMessages = session.pendingMessages.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            return a.timestamp.getTime() - b.timestamp.getTime();
        });
        const batchSize = 10;
        for (let i = 0; i < sortedMessages.length; i += batchSize) {
            const batch = sortedMessages.slice(i, i + batchSize);
            for (const message of batch) {
                try {
                    client.emit(message.event, {
                        ...message.data,
                        _isPendingMessage: true,
                        _messageId: message.id,
                        _originalTimestamp: message.timestamp,
                    });
                    this.logger.debug(`Mensagem pendente enviada: ${message.id}`);
                }
                catch (error) {
                    this.logger.error(`Erro ao enviar mensagem pendente ${message.id}:`, error);
                    message.retryCount++;
                    if (message.retryCount < message.maxRetries) {
                        continue;
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        session.pendingMessages = [];
        this.logger.log(`Mensagens pendentes processadas para usuário ${userId}`);
    }
    queueMessageForUser(userId, event, data, priority = 'medium') {
        const session = this.userSessions.get(userId);
        if (!session || session.isOnline) {
            return;
        }
        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event,
            data,
            timestamp: new Date(),
            priority,
            retryCount: 0,
            maxRetries: 3,
        };
        session.pendingMessages.push(message);
        if (session.pendingMessages.length > this.MAX_PENDING_MESSAGES) {
            session.pendingMessages = session.pendingMessages
                .filter(msg => msg.priority !== 'low')
                .slice(-this.MAX_PENDING_MESSAGES);
        }
        this.logger.debug(`Mensagem enfileirada para usuário offline ${userId}: ${event}`);
    }
    performHeartbeatCheck() {
        const now = new Date();
        const disconnectedClients = [];
        this.connectedClients.forEach((client, socketId) => {
            if (!client.lastHeartbeat) {
                client.lastHeartbeat = now;
                return;
            }
            const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
            if (timeSinceHeartbeat > this.HEARTBEAT_INTERVAL * 2) {
                this.logger.warn(`Cliente ${socketId} não respondeu ao heartbeat há ${timeSinceHeartbeat}ms`);
                disconnectedClients.push(socketId);
            }
            else if (timeSinceHeartbeat > this.HEARTBEAT_INTERVAL) {
                client.emit('ping', { timestamp: Date.now() });
            }
        });
        disconnectedClients.forEach(socketId => {
            const client = this.connectedClients.get(socketId);
            if (client) {
                this.logger.log(`Desconectando cliente inativo: ${socketId}`);
                client.disconnect(true);
            }
        });
    }
    handleUnexpectedDisconnect(socket) {
        if (!socket.user)
            return;
        const session = this.userSessions.get(socket.user.id);
        if (session) {
            session.isOnline = false;
            this.logger.log(`Desconexão inesperada detectada para usuário ${socket.user.name}`);
            if (socket.user.role === user_role_enum_1.UserRole.WAITER) {
                this.server.to('admins').emit('waiter-disconnected', {
                    userId: socket.user.id,
                    userName: socket.user.name,
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }
    cleanupUserSession(userId) {
        const session = this.userSessions.get(userId);
        if (session) {
            session.pendingMessages = [];
            this.messageQueue.delete(userId);
            this.userSessions.delete(userId);
            this.logger.log(`Sessão completamente limpa para usuário ${userId}`);
        }
    }
    updateStateVersion(resourceType, resourceId, modifiedBy) {
        const key = `${resourceType}:${resourceId}`;
        const version = Date.now();
        this.stateVersions.set(key, {
            resourceType,
            resourceId,
            version,
            lastModified: new Date(),
            modifiedBy,
        });
        return version;
    }
    getStateVersion(resourceType, resourceId) {
        const key = `${resourceType}:${resourceId}`;
        const stateVersion = this.stateVersions.get(key);
        return stateVersion ? stateVersion.version : 0;
    }
    hasVersionConflict(resourceType, resourceId, clientVersion) {
        const serverVersion = this.getStateVersion(resourceType, resourceId);
        return serverVersion > clientVersion;
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
    (0, websockets_1.SubscribeMessage)('request-tables-overview'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleTablesOverviewRequest", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-tables-overview'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleJoinTablesOverview", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-tables-overview'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleLeaveTablesOverview", null);
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
__decorate([
    (0, websockets_1.SubscribeMessage)('check-version'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleVersionCheck", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('request-full-sync'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleFullSyncRequest", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message-ack'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleMessageAcknowledgment", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('connectivity-status'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleConnectivityStatus", null);
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