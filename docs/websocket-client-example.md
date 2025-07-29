# WebSocket Client Example - Reconnection and Synchronization

This document provides examples of how to implement client-side reconnection and synchronization with the enhanced WebSocket gateway.

## Basic Client Setup with Reconnection

```javascript
import io from 'socket.io-client';

class RestaurantWebSocketClient {
  constructor(token, userRole) {
    this.token = token;
    this.userRole = userRole;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isConnected = false;
    this.lastSyncVersion = 0;
    this.pendingOperations = [];
    this.connectionId = null;
  }

  connect() {
    this.socket = io('/orders', {
      auth: {
        token: this.token
      },
      transports: ['websocket'],
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Connection established
    this.socket.on('connected', (data) => {
      console.log('Connected to server:', data);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.connectionId = data.connectionId;
      this.lastSyncVersion = data.syncData?.syncVersion || 0;

      if (data.isReconnection) {
        console.log('Reconnection detected, processing sync data...');
        this.handleReconnectionSync(data.syncData);
      }

      // Process any pending operations
      this.processPendingOperations();
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      // Attempt reconnection with exponential backoff
      this.attemptReconnection();
    });

    // Handle server shutdown notification
    this.socket.on('server-shutdown', (data) => {
      console.log('Server shutdown notification:', data);
      // Prepare for reconnection
      this.isConnected = false;
    });

    // Handle state changes
    this.socket.on('state-change', (data) => {
      console.log('State change received:', data);
      
      if (data.requiresAck) {
        // Send acknowledgment
        this.socket.emit('message-ack', {
          messageId: data.messageId,
          status: 'received'
        });
      }

      this.handleStateChange(data);
    });

    // Handle sync data
    this.socket.on('sync-data', (data) => {
      console.log('Sync data received:', data);
      this.lastSyncVersion = data.syncVersion;
      this.applySyncData(data);
    });

    // Handle full sync data
    this.socket.on('full-sync-data', (data) => {
      console.log('Full sync data received:', data);
      this.lastSyncVersion = data.syncVersion;
      this.applyFullSyncData(data);
    });

    // Handle conflict resolution
    this.socket.on('conflict-resolved', (data) => {
      console.log('Conflict resolved:', data);
      this.handleConflictResolution(data);
    });

    // Handle version check results
    this.socket.on('version-check-result', (data) => {
      console.log('Version check result:', data);
      if (data.hasConflict) {
        this.handleVersionConflict(data);
      }
    });

    // Handle ping/pong for heartbeat
    this.socket.on('ping', (data) => {
      this.socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle connection adjustments
    this.socket.on('adjust-update-frequency', (data) => {
      console.log('Adjusting update frequency:', data);
      // Implement client-side optimizations based on connectivity
    });

    // Handle errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.reportConnectivityStatus();
        this.socket.connect();
      }
    }, delay);
  }

  reportConnectivityStatus() {
    const status = this.reconnectAttempts > 2 ? 'poor' : 'unstable';
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('connectivity-status', {
        status,
        reconnectAttempts: this.reconnectAttempts,
        latency: this.measureLatency()
      });
    }
  }

  measureLatency() {
    // Simple latency measurement
    const start = Date.now();
    this.socket.emit('ping', { timestamp: start });
    
    return new Promise((resolve) => {
      this.socket.once('pong', (data) => {
        resolve(Date.now() - start);
      });
    });
  }

  // Synchronization methods
  requestSync() {
    if (this.isConnected) {
      this.socket.emit('request-sync');
    }
  }

  requestFullSync(resources = []) {
    if (this.isConnected) {
      this.socket.emit('request-full-sync', {
        lastSyncVersion: this.lastSyncVersion,
        resources
      });
    }
  }

  checkVersion(resourceType, resourceId, clientVersion) {
    if (this.isConnected) {
      this.socket.emit('check-version', {
        resourceType,
        resourceId,
        clientVersion
      });
    }
  }

  resolveConflict(resourceType, resourceId, clientVersion, clientData, strategy = 'server-wins') {
    if (this.isConnected) {
      this.socket.emit('resolve-conflict', {
        resourceType,
        resourceId,
        clientVersion,
        clientData,
        conflictStrategy: strategy
      });
    }
  }

  // Handle reconnection sync
  handleReconnectionSync(syncData) {
    console.log('Processing reconnection sync data...');
    
    // Apply sync data to local state
    this.applySyncData(syncData);
    
    // Check for any conflicts with local changes
    this.checkForConflicts();
  }

  // Handle state changes
  handleStateChange(data) {
    switch (data.type) {
      case 'order-created':
        this.handleNewOrder(data.data);
        break;
      case 'order-item-status-updated':
        this.handleOrderItemStatusUpdate(data.data);
        break;
      case 'table-status-updated':
        this.handleTableStatusUpdate(data.data);
        break;
      case 'order-closed':
        this.handleOrderClosed(data.data);
        break;
      default:
        console.log('Unknown state change type:', data.type);
    }
  }

  // Apply sync data to local state
  applySyncData(syncData) {
    // Update local state based on user role
    switch (this.userRole) {
      case 'kitchen':
        if (syncData.pendingOrders) {
          this.updatePendingOrders(syncData.pendingOrders);
        }
        break;
      case 'waiter':
        if (syncData.activeOrders) {
          this.updateActiveOrders(syncData.activeOrders);
        }
        if (syncData.tableStatuses) {
          this.updateTableStatuses(syncData.tableStatuses);
        }
        break;
      case 'admin':
        // Admin gets all data
        if (syncData.activeOrders) {
          this.updateActiveOrders(syncData.activeOrders);
        }
        if (syncData.tableStatuses) {
          this.updateTableStatuses(syncData.tableStatuses);
        }
        if (syncData.pendingOrders) {
          this.updatePendingOrders(syncData.pendingOrders);
        }
        break;
    }
  }

  // Handle version conflicts
  handleVersionConflict(conflictData) {
    console.log('Version conflict detected:', conflictData);
    
    // Implement conflict resolution strategy
    // For example, always prefer server version for critical data
    if (conflictData.resourceType === 'order' || conflictData.resourceType === 'table') {
      this.resolveConflict(
        conflictData.resourceType,
        conflictData.resourceId,
        conflictData.clientVersion,
        null,
        'server-wins'
      );
    } else {
      // For less critical data, might prefer client version
      this.resolveConflict(
        conflictData.resourceType,
        conflictData.resourceId,
        conflictData.clientVersion,
        this.getLocalData(conflictData.resourceType, conflictData.resourceId),
        'client-wins'
      );
    }
  }

  // Queue operations when offline
  queueOperation(operation) {
    this.pendingOperations.push({
      ...operation,
      timestamp: Date.now(),
      retries: 0
    });
  }

  processPendingOperations() {
    console.log(`Processing ${this.pendingOperations.length} pending operations`);
    
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    operations.forEach(operation => {
      try {
        this.executeOperation(operation);
      } catch (error) {
        console.error('Error executing pending operation:', error);
        
        // Retry logic
        if (operation.retries < 3) {
          operation.retries++;
          this.pendingOperations.push(operation);
        }
      }
    });
  }

  // Execute queued operations
  executeOperation(operation) {
    switch (operation.type) {
      case 'create-order':
        this.socket.emit('create-order', operation.data);
        break;
      case 'update-order-item-status':
        this.socket.emit('update-order-item-status', operation.data);
        break;
      case 'update-table-status':
        this.socket.emit('update-table-status', operation.data);
        break;
      default:
        console.log('Unknown operation type:', operation.type);
    }
  }

  // Public API methods
  createOrder(orderData) {
    if (this.isConnected) {
      this.socket.emit('create-order', orderData);
    } else {
      this.queueOperation({ type: 'create-order', data: orderData });
    }
  }

  updateOrderItemStatus(itemId, status) {
    const operation = {
      type: 'update-order-item-status',
      data: { itemId, status }
    };

    if (this.isConnected) {
      // Check version before updating
      this.checkVersion('order-item', itemId, this.getLocalVersion('order-item', itemId));
      this.socket.emit('update-order-item-status', operation.data);
    } else {
      this.queueOperation(operation);
    }
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Placeholder methods for local state management
  updatePendingOrders(orders) {
    console.log('Updating pending orders:', orders);
    // Implement local state update
  }

  updateActiveOrders(orders) {
    console.log('Updating active orders:', orders);
    // Implement local state update
  }

  updateTableStatuses(tables) {
    console.log('Updating table statuses:', tables);
    // Implement local state update
  }

  handleNewOrder(orderData) {
    console.log('New order received:', orderData);
    // Implement UI update
  }

  handleOrderItemStatusUpdate(itemData) {
    console.log('Order item status updated:', itemData);
    // Implement UI update
  }

  handleTableStatusUpdate(tableData) {
    console.log('Table status updated:', tableData);
    // Implement UI update
  }

  handleOrderClosed(orderData) {
    console.log('Order closed:', orderData);
    // Implement UI update
  }

  getLocalData(resourceType, resourceId) {
    // Implement local data retrieval
    return {};
  }

  getLocalVersion(resourceType, resourceId) {
    // Implement local version retrieval
    return 0;
  }

  checkForConflicts() {
    // Implement conflict detection logic
    console.log('Checking for conflicts...');
  }

  applyFullSyncData(data) {
    console.log('Applying full sync data:', data);
    // Implement full state synchronization
  }

  handleConflictResolution(data) {
    console.log('Applying conflict resolution:', data);
    // Implement conflict resolution handling
  }
}

// Usage example
const client = new RestaurantWebSocketClient('your-jwt-token', 'waiter');
client.connect();

// Example of handling operations
client.createOrder({
  tableId: 1,
  items: [
    { menuItemId: 'item-1', quantity: 2, specialInstructions: 'No onions' }
  ]
});

// Example of updating order item status
client.updateOrderItemStatus('item-123', 'ready');

// Example of requesting sync
client.requestSync();

// Example of requesting full sync for specific resources
client.requestFullSync(['orders', 'tables']);
```

## Key Features Demonstrated

1. **Automatic Reconnection**: Exponential backoff strategy with maximum attempts
2. **State Synchronization**: Automatic sync on reconnection with version checking
3. **Conflict Resolution**: Multiple strategies for handling data conflicts
4. **Message Queuing**: Operations are queued when offline and processed on reconnection
5. **Heartbeat Monitoring**: Ping/pong mechanism for connection health
6. **Connectivity Adaptation**: Client reports connectivity status for server optimization
7. **Version Control**: Client-server version checking to detect conflicts
8. **Role-based Sync**: Different sync data based on user role

## Best Practices

1. Always implement proper error handling
2. Use exponential backoff for reconnection attempts
3. Queue critical operations when offline
4. Implement conflict resolution strategies appropriate for your data
5. Monitor connection health and adapt behavior accordingly
6. Provide user feedback about connection status
7. Test reconnection scenarios thoroughly