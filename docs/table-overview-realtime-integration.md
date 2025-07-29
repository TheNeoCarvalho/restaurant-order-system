# Integração em Tempo Real do Painel de Mesas

Este documento descreve como o painel geral de mesas foi integrado com o sistema de notificações WebSocket para fornecer atualizações em tempo real.

## Visão Geral

O painel de mesas agora oferece:
- ✅ Atualizações automáticas de status das mesas
- ✅ Notificações em tempo real sobre mudanças em pedidos
- ✅ Destaque visual para mesas com pedidos pendentes
- ✅ Sincronização automática entre múltiplos clientes
- ✅ Reconexão automática em caso de perda de conexão

## Arquitetura da Integração

### 1. Endpoint REST para Dados Iniciais

**Endpoint:** `GET /tables/overview`

```typescript
// Parâmetros de consulta disponíveis
interface TablesOverviewQuery {
  status?: TableStatus;                    // Filtrar por status da mesa
  hasPendingOrders?: boolean;             // Filtrar mesas com pedidos pendentes
  sortBy?: 'number' | 'status' | 'orderDuration' | 'pendingItems';
  sortOrder?: 'ASC' | 'DESC';
  includeOrderDetails?: boolean;          // Incluir detalhes dos itens pendentes
}

// Resposta
interface TableOverviewDto {
  id: number;
  number: number;
  capacity: number;
  status: TableStatus;
  activeOrderId?: string;
  waiterName?: string;
  orderTotal?: number;
  totalItems?: number;
  pendingItems?: number;
  itemsInPreparation?: number;
  readyItems?: number;
  pendingOrderItems?: PendingOrderItemDto[];
  orderOpenedAt?: Date;
  orderDurationMinutes?: number;
  hasPendingOrders: boolean;
  priority: 'low' | 'medium' | 'high';
}
```

### 2. Eventos WebSocket

#### Conexão e Autenticação

```javascript
const socket = io('http://localhost:3000/orders', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Entrar na room específica do painel de mesas
socket.emit('join-tables-overview');
```

#### Eventos Disponíveis

| Evento | Descrição | Dados |
|--------|-----------|-------|
| `tables-overview-update` | Atualização geral do painel | `{ timestamp, message }` |
| `table-status-updated` | Status de mesa específica mudou | `{ tableId, tableNumber, status, capacity, updatedAt, version }` |
| `table-order-updated` | Pedido de mesa específica mudou | `{ tableId, orderData }` |
| `order-created` | Nova comanda criada | `{ orderId, tableNumber, waiterName, items, createdAt }` |
| `order-closed` | Comanda fechada | `{ orderId, tableNumber, totalAmount, closedAt, waiterName }` |
| `order-item-status-updated` | Status de item mudou | `{ orderItemId, orderId, menuItemName, status, updatedBy }` |

#### Solicitação de Dados

```javascript
// Solicitar dados atuais do painel
socket.emit('request-tables-overview', {
  filters: {
    status: 'occupied',
    sortBy: 'orderDuration',
    sortOrder: 'DESC'
  }
});

// Receber dados
socket.on('tables-overview-data', (data) => {
  console.log('Dados das mesas:', data.tables);
  console.log('Filtros aplicados:', data.filters);
  console.log('Timestamp:', data.timestamp);
});
```

## Implementação no Cliente

### 1. Conexão Básica

```javascript
class TablesOverviewPanel {
  constructor(serverUrl, jwtToken) {
    this.serverUrl = serverUrl;
    this.jwtToken = jwtToken;
    this.socket = null;
    this.tables = [];
    this.isConnected = false;
  }

  async connect() {
    this.socket = io(`${this.serverUrl}/orders`, {
      auth: { token: this.jwtToken },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
    
    // Entrar na room do painel
    this.socket.emit('join-tables-overview');
  }

  setupEventListeners() {
    // Eventos de conexão
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.onConnectionStatusChange(true);
      this.refreshTables();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.onConnectionStatusChange(false);
    });

    // Eventos do painel de mesas
    this.socket.on('tables-overview-update', () => {
      this.refreshTables();
    });

    this.socket.on('table-status-updated', (data) => {
      this.updateTableStatus(data);
    });

    this.socket.on('table-order-updated', (data) => {
      this.updateTableOrder(data);
    });

    this.socket.on('tables-overview-data', (data) => {
      this.tables = data.tables;
      this.renderTables();
    });
  }

  async refreshTables() {
    if (this.isConnected) {
      this.socket.emit('request-tables-overview', {
        filters: this.getCurrentFilters()
      });
    } else {
      // Fallback para REST API
      await this.fetchTablesViaREST();
    }
  }

  async fetchTablesViaREST() {
    try {
      const response = await fetch(`${this.serverUrl}/tables/overview`, {
        headers: {
          'Authorization': `Bearer ${this.jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        this.tables = await response.json();
        this.renderTables();
      }
    } catch (error) {
      console.error('Erro ao buscar mesas via REST:', error);
    }
  }

  updateTableStatus(data) {
    const table = this.tables.find(t => t.id === data.tableId);
    if (table) {
      table.status = data.status;
      this.renderTable(table);
    }
  }

  updateTableOrder(data) {
    const table = this.tables.find(t => t.id === data.tableId);
    if (table && data.orderData) {
      // Atualizar dados do pedido
      Object.assign(table, {
        activeOrderId: data.orderData.orderId,
        orderTotal: data.orderData.totalAmount,
        itemsCount: data.orderData.itemsCount,
        waiterName: data.orderData.waiterName
      });
      this.renderTable(table);
    }
  }

  renderTables() {
    // Implementar renderização das mesas
    // Aplicar classes CSS baseadas no status e prioridade
    this.tables.forEach(table => {
      this.renderTable(table);
    });
  }

  renderTable(table) {
    const element = document.querySelector(`[data-table-id="${table.id}"]`);
    if (element) {
      // Atualizar classes CSS
      element.className = `table-card ${table.status}`;
      
      if (table.priority === 'high') {
        element.classList.add('priority-high');
      }
      
      if (table.hasPendingOrders) {
        element.classList.add('has-pending-orders');
      }
      
      // Atualizar conteúdo
      this.updateTableContent(element, table);
    }
  }
}
```

### 2. Estilos CSS para Destaque Visual

```css
/* Estados das mesas */
.table-card {
  transition: all 0.3s ease;
  border-left: 4px solid #3498db;
}

.table-card.available {
  border-left-color: #27ae60;
}

.table-card.occupied {
  border-left-color: #e74c3c;
}

.table-card.reserved {
  border-left-color: #f39c12;
}

.table-card.cleaning {
  border-left-color: #9b59b6;
}

/* Destaque para mesas com pedidos pendentes */
.table-card.has-pending-orders {
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.2);
}

/* Animação para mesas de alta prioridade */
.table-card.priority-high {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { 
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
  }
  50% { 
    box-shadow: 0 6px 12px rgba(231, 76, 60, 0.4);
    transform: translateY(-2px);
  }
  100% { 
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
  }
}

/* Indicadores visuais */
.pending-items-indicator {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  font-size: 12px;
}

.priority-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.priority-indicator.low { background: #27ae60; }
.priority-indicator.medium { background: #f39c12; }
.priority-indicator.high { background: #e74c3c; }
```

## Fluxo de Notificações

### 1. Criação de Pedido

```
Cliente cria pedido → OrdersService.create() → 
  ↓
Mesa muda para OCCUPIED → TablesService.updateStatus() →
  ↓
OrdersGateway.notifyTableStatusUpdate() →
  ↓
OrdersGateway.notifyTableOrderUpdate() →
  ↓
Clientes recebem: 'table-status-updated' + 'table-order-updated'
```

### 2. Mudança de Status de Item

```
Cozinha marca item como pronto → OrderItemsService.updateStatus() →
  ↓
OrdersGateway.notifyOrderItemStatusUpdate() →
  ↓
OrdersGateway.notifyTableOrderUpdate() →
  ↓
Clientes recebem: 'order-item-status-updated' + 'table-order-updated'
```

### 3. Fechamento de Pedido

```
Garçom fecha conta → OrdersService.closeOrder() →
  ↓
Mesa muda para AVAILABLE → TablesService.updateStatus() →
  ↓
OrdersGateway.notifyOrderClosed() →
  ↓
OrdersGateway.notifyTableStatusUpdate() →
  ↓
OrdersGateway.notifyTableOrderUpdate() →
  ↓
Clientes recebem: 'order-closed' + 'table-status-updated' + 'table-order-updated'
```

## Tratamento de Erros e Reconexão

### 1. Reconexão Automática

```javascript
class TablesOverviewPanel {
  setupReconnection() {
    // Verificar conexão periodicamente
    setInterval(() => {
      if (!this.isConnected && this.socket) {
        console.log('Tentando reconectar...');
        this.socket.connect();
      }
    }, 5000);

    // Detectar perda de conexão
    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado:', reason);
      
      if (reason === 'io server disconnect') {
        // Reconectar manualmente se o servidor desconectou
        this.socket.connect();
      }
    });

    // Sincronizar dados após reconexão
    this.socket.on('connect', () => {
      console.log('Reconectado, sincronizando dados...');
      this.refreshTables();
    });
  }

  // Fallback para REST API quando WebSocket não está disponível
  async ensureDataFreshness() {
    if (!this.isConnected) {
      await this.fetchTablesViaREST();
    }
  }
}
```

### 2. Tratamento de Erros

```javascript
// Tratar erros de autenticação
socket.on('connect_error', (error) => {
  console.error('Erro de conexão:', error);
  
  if (error.message.includes('authentication')) {
    // Token expirado, solicitar novo login
    this.handleAuthenticationError();
  }
});

// Tratar erros específicos do painel
socket.on('tables-overview-error', (error) => {
  console.error('Erro no painel de mesas:', error);
  
  // Mostrar mensagem de erro para o usuário
  this.showErrorMessage(error.message);
  
  // Tentar fallback para REST API
  this.fetchTablesViaREST();
});
```

## Testes

### 1. Teste de Integração WebSocket

```typescript
describe('Tables Overview WebSocket Integration', () => {
  it('should notify when table status changes', async () => {
    const notifications = [];
    
    socket.on('table-status-updated', (data) => {
      notifications.push(data);
    });

    await tablesService.updateStatus(tableId, { 
      status: TableStatus.CLEANING 
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      tableId,
      status: TableStatus.CLEANING
    });
  });
});
```

### 2. Teste de Performance

```typescript
describe('Performance Tests', () => {
  it('should handle multiple simultaneous updates', async () => {
    const startTime = Date.now();
    
    // Simular múltiplas atualizações simultâneas
    const promises = Array.from({ length: 100 }, (_, i) => 
      tablesService.updateStatus(tableIds[i % tableIds.length], {
        status: TableStatus.OCCUPIED
      })
    );

    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Menos de 5 segundos
  });
});
```

## Monitoramento e Métricas

### 1. Métricas de Conexão

```typescript
// No OrdersGateway
private connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  reconnections: 0,
  errors: 0
};

afterInit() {
  // Log métricas periodicamente
  setInterval(() => {
    this.logger.log('Métricas WebSocket:', this.connectionMetrics);
  }, 60000);
}
```

### 2. Health Check

```typescript
@Controller('health')
export class HealthController {
  @Get('websocket')
  getWebSocketHealth() {
    return {
      status: 'ok',
      activeConnections: this.ordersGateway.getActiveConnectionsCount(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}
```

## Considerações de Segurança

1. **Autenticação JWT**: Todas as conexões WebSocket requerem token válido
2. **Autorização por Role**: Usuários só recebem eventos relevantes ao seu papel
3. **Rate Limiting**: Prevenção de spam de mensagens
4. **Validação de Dados**: Todos os dados são validados antes do processamento
5. **Logs de Auditoria**: Todas as ações são registradas para auditoria

## Exemplo Completo

Veja o arquivo `docs/table-overview-client-example.html` para um exemplo completo de implementação do cliente.