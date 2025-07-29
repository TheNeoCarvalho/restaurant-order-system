import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
import { JwtPayload } from '../auth/dto/auth-response.dto';

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

interface UserSession {
  socketId: string;
  lastSeen: Date;
  rooms: string[];
  connectionCount: number;
  connectionId: string;
  isOnline: boolean;
  pendingMessages: QueuedMessage[];
  lastSyncVersion: number;
}

interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
}

interface StateVersion {
  resourceType: string;
  resourceId: string;
  version: number;
  lastModified: Date;
  modifiedBy: string;
}

interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
  data?: any;
  conflictId: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/orders',
})
export class OrdersGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private userSessions = new Map<string, UserSession>();
  private cleanupInterval: NodeJS.Timeout;
  private heartbeatInterval: NodeJS.Timeout;
  private stateVersions = new Map<string, StateVersion>();
  private pendingConflicts = new Map<string, ConflictResolution>();
  private messageQueue = new Map<string, QueuedMessage[]>();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_TIMEOUT = 60000; // 1 minute
  private readonly MAX_PENDING_MESSAGES = 100;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('OrdersGateway inicializado');
    
    // Configurar limpeza periódica de sessões expiradas
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // A cada minuto

    // Configurar heartbeat para monitorar conexões
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, this.HEARTBEAT_INTERVAL);

    // Configurar eventos do servidor
    this.setupServerEvents();
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('Cleanup interval cleared');
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.logger.log('Heartbeat interval cleared');
    }

    // Notificar todos os clientes sobre desligamento do servidor
    this.server.emit('server-shutdown', {
      message: 'Servidor será reiniciado em breve',
      timestamp: new Date().toISOString(),
    });
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
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

      // Gerar ID único para esta conexão
      client.connectionId = this.generateConnectionId();
      client.lastHeartbeat = new Date();
      client.reconnectAttempts = 0;

      // Gerenciar sessão do usuário
      const isReconnection = await this.manageUserSession(client, user);

      // Adicionar cliente à room baseada no seu role
      await this.joinRoleBasedRoom(client);

      this.logger.log(
        `Cliente ${client.id} conectado como ${user.name} (${user.role}) - ${isReconnection ? 'Reconexão' : 'Nova conexão'}`,
      );

      // Processar mensagens pendentes se for reconexão
      if (isReconnection) {
        await this.processPendingMessages(user.id, client);
      }

      // Enviar confirmação de conexão com dados de sincronização
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
    } catch (error) {
      this.logger.error(`Erro na conexão do cliente ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    this.connectedClients.delete(client.id);
    
    if (client.user) {
      // Atualizar sessão do usuário
      this.updateUserSessionOnDisconnect(client.user.id);
      
      this.logger.log(
        `Cliente ${client.id} desconectado (${client.user.name} - ${client.user.role})`,
      );
    } else {
      this.logger.log(`Cliente ${client.id} desconectado`);
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    const { room } = data;
    
    // Validar se o usuário pode entrar na room solicitada
    if (this.canJoinRoom(client.user.role, room)) {
      await client.join(room);
      this.logger.log(
        `Cliente ${client.id} (${client.user.name}) entrou na room: ${room}`,
      );
      client.emit('joined-room', { room });
    } else {
      this.logger.warn(
        `Cliente ${client.id} (${client.user.name}) tentou entrar na room não autorizada: ${room}`,
      );
      client.emit('error', { 
        message: 'Não autorizado a entrar nesta room',
        room 
      });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ): Promise<void> {
    const { room } = data;
    await client.leave(room);
    
    if (client.user) {
      this.logger.log(
        `Cliente ${client.id} (${client.user.name}) saiu da room: ${room}`,
      );
    }
    
    client.emit('left-room', { room });
  }

  // Métodos para emitir eventos específicos

  /**
   * Notifica sobre um novo pedido - enviado para a cozinha
   */
  notifyNewOrder(order: Order): void {
    this.logger.log(`Notificando novo pedido: ${order.id} para mesa ${order.table.number}`);
    
    // Atualizar versão do estado
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

    // Broadcast com confirmação para garantir entrega
    this.broadcastWithAck('order-created', orderData, [UserRole.KITCHEN, UserRole.ADMIN]);
    
    // Também enviar evento específico para a cozinha
    this.server.to('kitchen').emit('new-order', orderData);
  }

  /**
   * Notifica sobre mudança de status de um item do pedido
   */
  notifyOrderItemStatusUpdate(orderItem: OrderItem): void {
    this.logger.log(
      `Notificando mudança de status do item ${orderItem.id}: ${orderItem.status}`,
    );

    // Atualizar versão do estado
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

    // Broadcast para sincronização
    this.broadcastStateChange('order-item-status-updated', notification);

    // Notificar garçons sobre mudanças de status
    this.server.to('waiters').emit('order-item-status-updated', notification);

    // Notificar cozinha sobre mudanças relevantes
    if (orderItem.status === 'cancelled') {
      this.server.to('kitchen').emit('order-item-cancelled', notification);
    }

    // Notificar admins sobre todas as mudanças
    this.server.to('admins').emit('order-item-status-updated', notification);
  }

  /**
   * Notifica sobre mudança de status de uma mesa
   */
  notifyTableStatusUpdate(table: Table): void {
    this.logger.log(`Notificando mudança de status da mesa ${table.number}: ${table.status}`);

    // Atualizar versão do estado
    const version = this.updateStateVersion('table', table.id.toString(), 'system');

    const notification = {
      tableId: table.id,
      tableNumber: table.number,
      status: table.status,
      capacity: table.capacity,
      updatedAt: table.updatedAt,
      version,
    };

    // Broadcast para sincronização
    this.broadcastStateChange('table-status-updated', notification);

    // Notificar todos os usuários sobre mudanças de status das mesas
    this.server.emit('table-status-updated', notification);

    // Notificar especificamente sobre mudanças no painel geral
    this.notifyTableOverviewUpdate();
  }

  /**
   * Notifica sobre atualizações no painel geral de mesas
   */
  notifyTableOverviewUpdate(): void {
    this.logger.log('Notificando atualização do painel geral de mesas');

    // Emitir evento específico para atualização do painel
    this.server.emit('tables-overview-update', {
      timestamp: new Date().toISOString(),
      message: 'Painel de mesas atualizado',
    });

    // Emitir também para a room específica do painel de mesas
    this.server.to('tables-overview').emit('tables-overview-refresh', {
      timestamp: new Date().toISOString(),
      message: 'Dados do painel atualizados - refresh necessário',
    });
  }

  /**
   * Notifica sobre mudanças em pedidos que afetam o painel de mesas
   */
  notifyTableOrderUpdate(tableId: number, orderData: any): void {
    this.logger.log(`Notificando atualização de pedido para mesa ${tableId}`);

    const notification = {
      tableId,
      orderData,
      timestamp: new Date().toISOString(),
    };

    // Notificar sobre mudança específica da mesa
    this.server.emit('table-order-updated', notification);

    // Notificar atualização geral do painel
    this.notifyTableOverviewUpdate();
  }

  /**
   * Notifica sobre fechamento de uma comanda
   */
  notifyOrderClosed(order: Order): void {
    this.logger.log(`Notificando fechamento da comanda ${order.id} da mesa ${order.table.number}`);

    // Atualizar versão do estado
    const version = this.updateStateVersion('order', order.id, order.waiter.id);

    const notification = {
      orderId: order.id,
      tableNumber: order.table.number,
      totalAmount: order.totalAmount,
      closedAt: order.closedAt,
      waiterName: order.waiter.name,
      version,
    };

    // Broadcast para sincronização
    this.broadcastStateChange('order-closed', notification);

    // Notificar garçons e admins sobre fechamento de comandas
    this.server.to('waiters').emit('order-closed', notification);
    this.server.to('admins').emit('order-closed', notification);
  }

  // Métodos auxiliares privados

  private extractTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token || 
                 client.handshake.headers?.authorization?.replace('Bearer ', '');
    return token || null;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload = this.jwtService.verify(token, { secret }) as JwtPayload;
      
      const user = await this.usersService.findById(payload.sub);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error) {
      this.logger.error('Erro na validação do token:', error);
      return null;
    }
  }

  private async joinRoleBasedRoom(client: AuthenticatedSocket): Promise<void> {
    if (!client.user) return;

    const roleRoomMap = {
      [UserRole.ADMIN]: 'admins',
      [UserRole.WAITER]: 'waiters',
      [UserRole.KITCHEN]: 'kitchen',
    };

    const room = roleRoomMap[client.user.role];
    if (room) {
      await client.join(room);
      this.logger.log(`Cliente ${client.id} adicionado à room: ${room}`);
    }
  }

  private canJoinRoom(userRole: UserRole, room: string): boolean {
    const rolePermissions = {
      [UserRole.ADMIN]: ['admins', 'waiters', 'kitchen', 'general'],
      [UserRole.WAITER]: ['waiters', 'general'],
      [UserRole.KITCHEN]: ['kitchen', 'general'],
    };

    return rolePermissions[userRole]?.includes(room) || false;
  }

  /**
   * Gerenciar sessão do usuário para suporte à reconexão
   */
  private async manageUserSession(client: AuthenticatedSocket, user: any): Promise<boolean> {
    const existingSession = this.userSessions.get(user.id);
    
    if (existingSession) {
      // Usuário reconectando
      const wasOffline = !existingSession.isOnline;
      
      existingSession.socketId = client.id;
      existingSession.lastSeen = new Date();
      existingSession.connectionCount++;
      existingSession.connectionId = client.connectionId!;
      existingSession.isOnline = true;
      
      this.logger.log(
        `Usuário ${user.name} reconectou (conexão #${existingSession.connectionCount}) - ${wasOffline ? 'Estava offline' : 'Troca de conexão'}`,
      );
      
      return true; // É uma reconexão
    } else {
      // Nova sessão
      this.userSessions.set(user.id, {
        socketId: client.id,
        lastSeen: new Date(),
        rooms: [],
        connectionCount: 1,
        connectionId: client.connectionId!,
        isOnline: true,
        pendingMessages: [],
        lastSyncVersion: Date.now(),
      });
      
      this.logger.log(`Nova sessão criada para usuário ${user.name}`);
      return false; // Nova conexão
    }
  }

  /**
   * Atualizar sessão do usuário na desconexão
   */
  private updateUserSessionOnDisconnect(userId: string): void {
    const session = this.userSessions.get(userId);
    if (session) {
      session.lastSeen = new Date();
      session.isOnline = false;
      
      // Manter a sessão por um tempo para permitir reconexão
      setTimeout(() => {
        const currentSession = this.userSessions.get(userId);
        if (currentSession && !currentSession.isOnline && currentSession.lastSeen === session.lastSeen) {
          // Se não houve reconexão, limpar a sessão
          this.cleanupUserSession(userId);
        }
      }, this.RECONNECT_TIMEOUT);
    }
  }

  /**
   * Verificar se é uma reconexão
   */
  private isReconnection(userId: string): boolean {
    const session = this.userSessions.get(userId);
    return session ? session.connectionCount > 1 : false;
  }

  /**
   * Obter dados de sincronização para o usuário
   */
  private async getSyncDataForUser(user: any): Promise<any> {
    // Aqui você pode buscar dados específicos baseados no role do usuário
    const syncData: any = {
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    };

    switch (user.role) {
      case UserRole.KITCHEN:
        // Dados relevantes para a cozinha
        syncData.pendingOrders = await this.getPendingOrdersForKitchen();
        break;
      
      case UserRole.WAITER:
        // Dados relevantes para garçons
        syncData.activeOrders = await this.getActiveOrdersForWaiter();
        syncData.tableStatuses = await this.getTableStatuses();
        break;
      
      case UserRole.ADMIN:
        // Dados completos para admin
        syncData.activeOrders = await this.getActiveOrdersForWaiter();
        syncData.tableStatuses = await this.getTableStatuses();
        syncData.pendingOrders = await this.getPendingOrdersForKitchen();
        syncData.systemStats = this.getConnectionStats();
        break;
    }

    return syncData;
  }

  /**
   * Obter pedidos pendentes para a cozinha
   */
  private async getPendingOrdersForKitchen(): Promise<any[]> {
    // Esta seria uma chamada para o serviço apropriado
    // Por enquanto, retornamos dados mock
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

  /**
   * Obter pedidos ativos para garçons
   */
  private async getActiveOrdersForWaiter(): Promise<any[]> {
    // Esta seria uma chamada para o serviço apropriado
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

  /**
   * Obter status das mesas
   */
  private async getTableStatuses(): Promise<any[]> {
    // Esta seria uma chamada para o serviço apropriado
    return [
      { id: 1, number: 1, status: 'available', capacity: 4 },
      { id: 2, number: 2, status: 'occupied', capacity: 2 },
      { id: 3, number: 3, status: 'cleaning', capacity: 6 },
    ];
  }

  /**
   * Solicitar dados do painel de mesas em tempo real
   */
  @SubscribeMessage('request-tables-overview')
  async handleTablesOverviewRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      filters?: {
        status?: string;
        hasPendingOrders?: boolean;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
      };
    },
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    try {
      this.logger.log(`Solicitação de overview de mesas do cliente ${client.id}`);

      // Aqui você chamaria o TablesService para obter dados reais
      // const tablesOverview = await this.tablesService.getTablesOverview(data.filters);
      
      // Por enquanto, enviamos dados mock
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

    } catch (error) {
      this.logger.error(`Erro ao buscar overview de mesas para cliente ${client.id}:`, error);
      client.emit('tables-overview-error', {
        message: 'Erro ao buscar dados das mesas',
        error: error.message,
      });
    }
  }

  /**
   * Entrar na room específica para atualizações do painel de mesas
   */
  @SubscribeMessage('join-tables-overview')
  async handleJoinTablesOverview(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
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

  /**
   * Sair da room do painel de mesas
   */
  @SubscribeMessage('leave-tables-overview')
  async handleLeaveTablesOverview(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    await client.leave('tables-overview');
    
    if (client.user) {
      this.logger.log(`Cliente ${client.id} (${client.user.name}) saiu da room tables-overview`);
    }
    
    client.emit('left-tables-overview', {
      message: 'Desconectado do painel de mesas',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sincronizar estado com cliente específico
   */
  @SubscribeMessage('request-sync')
  async handleSyncRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    this.logger.log(`Solicitação de sincronização do cliente ${client.id}`);

    const syncData = await this.getSyncDataForUser(client.user);
    client.emit('sync-data', syncData);
  }

  /**
   * Resolver conflitos quando múltiplos usuários modificam dados
   */
  @SubscribeMessage('resolve-conflict')
  async handleConflictResolution(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      resourceType: string; 
      resourceId: string; 
      clientVersion: number; 
      clientData?: any;
      conflictStrategy?: 'server-wins' | 'client-wins' | 'merge';
    },
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    const { resourceType, resourceId, clientVersion, clientData, conflictStrategy = 'server-wins' } = data;
    const serverVersion = this.getStateVersion(resourceType, resourceId);

    this.logger.log(
      `Resolvendo conflito para ${resourceType}:${resourceId} - Cliente: v${clientVersion}, Servidor: v${serverVersion}, Estratégia: ${conflictStrategy}`,
    );

    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let resolution: ConflictResolution;

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
            // Aplicar dados do cliente e atualizar versão
            await this.applyClientData(resourceType, resourceId, clientData, client.user.id);
            const newVersion = this.updateStateVersion(resourceType, resourceId, client.user.id);
            
            resolution = {
              strategy: 'client-wins',
              data: clientData,
              conflictId,
            };

            // Notificar outros clientes sobre a mudança
            this.broadcastStateChange(`${resourceType}-updated`, {
              resourceType,
              resourceId,
              data: clientData,
              version: newVersion,
              updatedBy: client.user.name,
            });
          } else {
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

          // Notificar outros clientes sobre a mudança
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

    } catch (error) {
      this.logger.error(`Erro ao resolver conflito ${conflictId}:`, error);
      client.emit('conflict-resolution-failed', {
        conflictId,
        error: error.message,
        resourceType,
        resourceId,
      });
    }
  }

  /**
   * Verificar versão antes de atualização
   */
  @SubscribeMessage('check-version')
  async handleVersionCheck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      resourceType: string; 
      resourceId: string; 
      clientVersion: number;
    },
  ): Promise<void> {
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
      this.logger.log(
        `Conflito de versão detectado para ${resourceType}:${resourceId} - Cliente: v${clientVersion}, Servidor: v${serverVersion}`,
      );
    }
  }

  /**
   * Solicitar sincronização completa
   */
  @SubscribeMessage('request-full-sync')
  async handleFullSyncRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      lastSyncVersion?: number;
      resources?: string[];
    },
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    const { lastSyncVersion = 0, resources = [] } = data;

    this.logger.log(`Sincronização completa solicitada pelo cliente ${client.id} - Última versão: ${lastSyncVersion}`);

    try {
      const syncData = await this.getFullSyncData(client.user, lastSyncVersion, resources);
      
      // Atualizar versão de sincronização da sessão
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

    } catch (error) {
      this.logger.error(`Erro na sincronização completa para cliente ${client.id}:`, error);
      client.emit('sync-error', {
        message: 'Erro na sincronização completa',
        error: error.message,
      });
    }
  }

  /**
   * Confirmar recebimento de mensagem
   */
  @SubscribeMessage('message-ack')
  async handleMessageAcknowledgment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      messageId: string;
      status: 'received' | 'processed' | 'error';
      error?: string;
    },
  ): Promise<void> {
    const { messageId, status, error } = data;

    this.logger.debug(`ACK recebido do cliente ${client.id} para mensagem ${messageId}: ${status}`);

    if (status === 'error') {
      this.logger.error(`Erro no processamento da mensagem ${messageId} pelo cliente ${client.id}: ${error}`);
      // Aqui você pode implementar lógica de retry ou notificação
    }
  }

  /**
   * Reportar status de conectividade do cliente
   */
  @SubscribeMessage('connectivity-status')
  async handleConnectivityStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      status: 'stable' | 'unstable' | 'poor';
      latency?: number;
      reconnectAttempts?: number;
    },
  ): Promise<void> {
    if (!client.user) return;

    const { status, latency, reconnectAttempts } = data;
    
    this.logger.debug(`Status de conectividade do cliente ${client.id}: ${status} (latência: ${latency}ms, tentativas: ${reconnectAttempts})`);

    // Ajustar comportamento baseado na conectividade
    if (status === 'poor' || (latency && latency > 1000)) {
      // Reduzir frequência de atualizações para clientes com conectividade ruim
      client.emit('adjust-update-frequency', {
        heartbeatInterval: this.HEARTBEAT_INTERVAL * 2,
        batchUpdates: true,
        reducedData: true,
      });
    }

    // Atualizar estatísticas da sessão
    const session = this.userSessions.get(client.user.id);
    if (session) {
      (session as any).connectivityStatus = status;
      (session as any).latency = latency;
      (session as any).reconnectAttempts = reconnectAttempts;
    }
  }

  /**
   * Obter dados mais recentes de um recurso
   */
  private async getLatestResourceData(resourceType: string, resourceId: string): Promise<any> {
    // Esta seria uma implementação real baseada no tipo de recurso
    switch (resourceType) {
      case 'order':
        // Aqui você chamaria o OrdersService para obter dados reais
        return { 
          id: resourceId, 
          status: 'updated', 
          timestamp: new Date(),
          version: this.getStateVersion(resourceType, resourceId),
        };
      case 'table':
        // Aqui você chamaria o TablesService para obter dados reais
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

  /**
   * Aplicar dados do cliente ao servidor
   */
  private async applyClientData(resourceType: string, resourceId: string, data: any, userId: string): Promise<void> {
    this.logger.log(`Aplicando dados do cliente para ${resourceType}:${resourceId} por usuário ${userId}`);
    
    // Aqui você implementaria a lógica real para persistir os dados
    // Por exemplo, chamar o serviço apropriado para atualizar o banco de dados
    
    switch (resourceType) {
      case 'order':
        // await this.ordersService.updateOrder(resourceId, data);
        break;
      case 'table':
        // await this.tablesService.updateTable(resourceId, data);
        break;
      case 'order-item':
        // await this.orderItemsService.updateOrderItem(resourceId, data);
        break;
      default:
        throw new Error(`Tipo de recurso não suportado: ${resourceType}`);
    }
  }

  /**
   * Mesclar dados conflitantes
   */
  private async mergeConflictingData(serverData: any, clientData: any, resourceType: string): Promise<any> {
    this.logger.log(`Mesclando dados conflitantes para tipo: ${resourceType}`);

    // Estratégias de merge específicas por tipo de recurso
    switch (resourceType) {
      case 'order':
        return this.mergeOrderData(serverData, clientData);
      case 'table':
        return this.mergeTableData(serverData, clientData);
      case 'order-item':
        return this.mergeOrderItemData(serverData, clientData);
      default:
        // Merge genérico - priorizar dados mais recentes
        return {
          ...serverData,
          ...clientData,
          mergedAt: new Date().toISOString(),
          mergeStrategy: 'client-priority',
        };
    }
  }

  /**
   * Mesclar dados de pedido
   */
  private mergeOrderData(serverData: any, clientData: any): any {
    return {
      ...serverData,
      // Priorizar status do servidor se for mais avançado
      status: this.getMostAdvancedOrderStatus(serverData.status, clientData.status),
      // Manter o maior valor total (assumindo que é mais recente)
      totalAmount: Math.max(serverData.totalAmount || 0, clientData.totalAmount || 0),
      // Mesclar itens
      items: this.mergeOrderItems(serverData.items || [], clientData.items || []),
      // Metadados de merge
      mergedAt: new Date().toISOString(),
      mergeStrategy: 'order-specific',
    };
  }

  /**
   * Mesclar dados de mesa
   */
  private mergeTableData(serverData: any, clientData: any): any {
    return {
      ...serverData,
      // Priorizar status do servidor para mesas
      status: serverData.status,
      // Manter capacidade do servidor
      capacity: serverData.capacity,
      // Usar timestamp mais recente
      updatedAt: new Date(Math.max(
        new Date(serverData.updatedAt || 0).getTime(),
        new Date(clientData.updatedAt || 0).getTime()
      )).toISOString(),
      mergedAt: new Date().toISOString(),
      mergeStrategy: 'server-priority',
    };
  }

  /**
   * Mesclar dados de item de pedido
   */
  private mergeOrderItemData(serverData: any, clientData: any): any {
    return {
      ...serverData,
      // Priorizar status mais avançado
      status: this.getMostAdvancedOrderItemStatus(serverData.status, clientData.status),
      // Manter instruções especiais do cliente se existirem
      specialInstructions: clientData.specialInstructions || serverData.specialInstructions,
      // Usar timestamp mais recente
      updatedAt: new Date(Math.max(
        new Date(serverData.updatedAt || 0).getTime(),
        new Date(clientData.updatedAt || 0).getTime()
      )).toISOString(),
      mergedAt: new Date().toISOString(),
      mergeStrategy: 'status-priority',
    };
  }

  /**
   * Obter status de pedido mais avançado
   */
  private getMostAdvancedOrderStatus(status1: string, status2: string): string {
    const statusOrder = ['open', 'closed', 'cancelled'];
    const index1 = statusOrder.indexOf(status1);
    const index2 = statusOrder.indexOf(status2);
    
    return index1 > index2 ? status1 : status2;
  }

  /**
   * Obter status de item de pedido mais avançado
   */
  private getMostAdvancedOrderItemStatus(status1: string, status2: string): string {
    const statusOrder = ['pending', 'in_preparation', 'ready', 'delivered', 'cancelled'];
    const index1 = statusOrder.indexOf(status1);
    const index2 = statusOrder.indexOf(status2);
    
    return index1 > index2 ? status1 : status2;
  }

  /**
   * Mesclar itens de pedido
   */
  private mergeOrderItems(serverItems: any[], clientItems: any[]): any[] {
    const itemsMap = new Map();
    
    // Adicionar itens do servidor
    serverItems.forEach(item => {
      itemsMap.set(item.id, item);
    });
    
    // Mesclar com itens do cliente
    clientItems.forEach(clientItem => {
      const serverItem = itemsMap.get(clientItem.id);
      if (serverItem) {
        // Mesclar item existente
        itemsMap.set(clientItem.id, this.mergeOrderItemData(serverItem, clientItem));
      } else {
        // Adicionar novo item do cliente
        itemsMap.set(clientItem.id, clientItem);
      }
    });
    
    return Array.from(itemsMap.values());
  }

  /**
   * Obter dados completos para sincronização
   */
  private async getFullSyncData(user: any, lastSyncVersion: number, resources: string[]): Promise<any> {
    const syncData: any = {
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
      syncVersion: Date.now(),
      resources: {},
    };

    // Se não especificou recursos, incluir todos baseados no role
    if (resources.length === 0) {
      switch (user.role) {
        case UserRole.KITCHEN:
          resources = ['orders', 'order-items'];
          break;
        case UserRole.WAITER:
          resources = ['orders', 'tables', 'order-items'];
          break;
        case UserRole.ADMIN:
          resources = ['orders', 'tables', 'order-items', 'menu-items', 'users'];
          break;
      }
    }

    // Obter dados para cada recurso solicitado
    for (const resource of resources) {
      try {
        syncData.resources[resource] = await this.getResourceDataForSync(resource, user, lastSyncVersion);
      } catch (error) {
        this.logger.error(`Erro ao obter dados de sincronização para ${resource}:`, error);
        syncData.resources[resource] = { error: error.message };
      }
    }

    return syncData;
  }

  /**
   * Obter dados de um recurso específico para sincronização
   */
  private async getResourceDataForSync(resource: string, user: any, lastSyncVersion: number): Promise<any> {
    // Aqui você implementaria chamadas reais para os serviços
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

  /**
   * Broadcast de mudanças para sincronização
   */
  broadcastStateChange(changeType: string, data: any): void {
    this.logger.log(`Broadcasting state change: ${changeType}`);
    
    const changeData = {
      type: changeType,
      data,
      timestamp: new Date().toISOString(),
      version: Date.now(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Enviar para clientes online
    this.server.emit('state-change', changeData);

    // Enfileirar para usuários offline baseado no tipo de mudança
    this.queueChangeForOfflineUsers(changeType, changeData);
  }

  /**
   * Enfileirar mudança para usuários offline
   */
  private queueChangeForOfflineUsers(changeType: string, changeData: any): void {
    // Determinar quais tipos de usuário devem receber esta mudança
    const relevantRoles = this.getRelevantRolesForChange(changeType);
    
    this.userSessions.forEach((session, userId) => {
      if (!session.isOnline) {
        // Verificar se o usuário deve receber esta mudança
        const client = this.connectedClients.get(session.socketId);
        if (client?.user && relevantRoles.includes(client.user.role)) {
          const priority = this.getMessagePriority(changeType);
          this.queueMessageForUser(userId, 'state-change', changeData, priority);
        }
      }
    });
  }

  /**
   * Determinar roles relevantes para um tipo de mudança
   */
  private getRelevantRolesForChange(changeType: string): UserRole[] {
    const roleMap: Record<string, UserRole[]> = {
      'order-created': [UserRole.KITCHEN, UserRole.ADMIN],
      'order-updated': [UserRole.WAITER, UserRole.ADMIN],
      'order-item-status-updated': [UserRole.WAITER, UserRole.ADMIN],
      'table-status-updated': [UserRole.WAITER, UserRole.ADMIN],
      'menu-item-updated': [UserRole.WAITER, UserRole.ADMIN],
      'user-connected': [UserRole.ADMIN],
      'user-disconnected': [UserRole.ADMIN],
    };

    return roleMap[changeType] || [UserRole.ADMIN];
  }

  /**
   * Determinar prioridade da mensagem baseada no tipo
   */
  private getMessagePriority(changeType: string): 'high' | 'medium' | 'low' {
    const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
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

  /**
   * Broadcast com confirmação de entrega
   */
  broadcastWithAck(changeType: string, data: any, targetRoles?: UserRole[]): void {
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
      // Enviar apenas para roles específicos
      targetRoles.forEach(role => {
        const roomName = this.getRoomNameForRole(role);
        this.server.to(roomName).emit('state-change', changeData);
      });
    } else {
      // Enviar para todos
      this.server.emit('state-change', changeData);
    }

    // Configurar timeout para ACK
    setTimeout(() => {
      this.handleMissingAck(messageId, changeType);
    }, 10000); // 10 segundos para ACK
  }

  /**
   * Obter nome da room para um role
   */
  private getRoomNameForRole(role: UserRole): string {
    const roleRoomMap = {
      [UserRole.ADMIN]: 'admins',
      [UserRole.WAITER]: 'waiters',
      [UserRole.KITCHEN]: 'kitchen',
    };

    return roleRoomMap[role];
  }

  /**
   * Lidar com ACK perdido
   */
  private handleMissingAck(messageId: string, changeType: string): void {
    this.logger.warn(`ACK não recebido para mensagem ${messageId} (${changeType})`);
    
    // Aqui você pode implementar lógica de retry ou notificação
    // Por exemplo, reenviar a mensagem ou alertar administradores
  }

  /**
   * Método para obter estatísticas de conexões (útil para debugging)
   */
  getConnectionStats(): any {
    const stats = {
      totalConnections: this.connectedClients.size,
      totalSessions: this.userSessions.size,
      usersByRole: {
        [UserRole.ADMIN]: 0,
        [UserRole.WAITER]: 0,
        [UserRole.KITCHEN]: 0,
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

  /**
   * Limpar sessões expiradas (chamado periodicamente)
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    this.userSessions.forEach((session, userId) => {
      const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
      if (timeSinceLastSeen > 300000) { // 5 minutos
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

  /**
   * Configurar eventos do servidor
   */
  private setupServerEvents(): void {
    this.server.on('connection', (socket: AuthenticatedSocket) => {
      // Configurar listeners específicos da conexão
      socket.on('ping', () => {
        socket.lastHeartbeat = new Date();
        socket.emit('pong', { timestamp: Date.now() });
      });

      socket.on('disconnect', (reason) => {
        this.logger.log(`Cliente ${socket.id} desconectado: ${reason}`);
        if (reason === 'transport close' || reason === 'transport error') {
          // Desconexão inesperada - marcar para reconexão
          this.handleUnexpectedDisconnect(socket);
        }
      });
    });
  }

  /**
   * Gerar ID único para conexão
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Processar mensagens pendentes para usuário reconectado
   */
  private async processPendingMessages(userId: string, client: AuthenticatedSocket): Promise<void> {
    const session = this.userSessions.get(userId);
    if (!session || session.pendingMessages.length === 0) {
      return;
    }

    this.logger.log(`Processando ${session.pendingMessages.length} mensagens pendentes para usuário ${userId}`);

    // Ordenar mensagens por prioridade e timestamp
    const sortedMessages = session.pendingMessages.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Enviar mensagens em lotes para evitar sobrecarga
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
        } catch (error) {
          this.logger.error(`Erro ao enviar mensagem pendente ${message.id}:`, error);
          message.retryCount++;
          
          if (message.retryCount < message.maxRetries) {
            // Reagendar para nova tentativa
            continue;
          }
        }
      }
      
      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Limpar mensagens processadas
    session.pendingMessages = [];
    this.logger.log(`Mensagens pendentes processadas para usuário ${userId}`);
  }

  /**
   * Adicionar mensagem à fila para usuário offline
   */
  private queueMessageForUser(userId: string, event: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const session = this.userSessions.get(userId);
    if (!session || session.isOnline) {
      return; // Usuário online, não precisa enfileirar
    }

    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: new Date(),
      priority,
      retryCount: 0,
      maxRetries: 3,
    };

    session.pendingMessages.push(message);

    // Limitar número de mensagens pendentes
    if (session.pendingMessages.length > this.MAX_PENDING_MESSAGES) {
      // Remover mensagens mais antigas com prioridade baixa
      session.pendingMessages = session.pendingMessages
        .filter(msg => msg.priority !== 'low')
        .slice(-this.MAX_PENDING_MESSAGES);
    }

    this.logger.debug(`Mensagem enfileirada para usuário offline ${userId}: ${event}`);
  }

  /**
   * Realizar verificação de heartbeat
   */
  private performHeartbeatCheck(): void {
    const now = new Date();
    const disconnectedClients: string[] = [];

    this.connectedClients.forEach((client, socketId) => {
      if (!client.lastHeartbeat) {
        client.lastHeartbeat = now;
        return;
      }

      const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > this.HEARTBEAT_INTERVAL * 2) {
        // Cliente não respondeu ao heartbeat
        this.logger.warn(`Cliente ${socketId} não respondeu ao heartbeat há ${timeSinceHeartbeat}ms`);
        disconnectedClients.push(socketId);
      } else if (timeSinceHeartbeat > this.HEARTBEAT_INTERVAL) {
        // Enviar ping para verificar conexão
        client.emit('ping', { timestamp: Date.now() });
      }
    });

    // Desconectar clientes que não respondem
    disconnectedClients.forEach(socketId => {
      const client = this.connectedClients.get(socketId);
      if (client) {
        this.logger.log(`Desconectando cliente inativo: ${socketId}`);
        client.disconnect(true);
      }
    });
  }

  /**
   * Lidar com desconexão inesperada
   */
  private handleUnexpectedDisconnect(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const session = this.userSessions.get(socket.user.id);
    if (session) {
      session.isOnline = false;
      this.logger.log(`Desconexão inesperada detectada para usuário ${socket.user.name}`);
      
      // Notificar outros usuários sobre a desconexão (se relevante)
      if (socket.user.role === UserRole.WAITER) {
        this.server.to('admins').emit('waiter-disconnected', {
          userId: socket.user.id,
          userName: socket.user.name,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Limpar sessão do usuário completamente
   */
  private cleanupUserSession(userId: string): void {
    const session = this.userSessions.get(userId);
    if (session) {
      // Limpar mensagens pendentes
      session.pendingMessages = [];
      
      // Remover da fila de mensagens
      this.messageQueue.delete(userId);
      
      // Remover sessão
      this.userSessions.delete(userId);
      
      this.logger.log(`Sessão completamente limpa para usuário ${userId}`);
    }
  }

  /**
   * Atualizar versão do estado de um recurso
   */
  private updateStateVersion(resourceType: string, resourceId: string, modifiedBy: string): number {
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

  /**
   * Obter versão atual do estado de um recurso
   */
  private getStateVersion(resourceType: string, resourceId: string): number {
    const key = `${resourceType}:${resourceId}`;
    const stateVersion = this.stateVersions.get(key);
    return stateVersion ? stateVersion.version : 0;
  }

  /**
   * Verificar se há conflito de versão
   */
  private hasVersionConflict(resourceType: string, resourceId: string, clientVersion: number): boolean {
    const serverVersion = this.getStateVersion(resourceType, resourceId);
    return serverVersion > clientVersion;
  }
}