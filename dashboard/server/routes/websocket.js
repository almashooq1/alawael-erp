/**
 * WebSocket Handler for Real-time Updates
 */

const qualityService = require('../services/quality');

// Store active connections
const clients = new Set();

function setupWebSocket(wss) {
  // Set broadcast function in quality service to avoid circular dependency
  qualityService.setBroadcastFunction(broadcastToService);
  wss.on('connection', ws => {
    console.log('🔌 New WebSocket connection');
    clients.add(ws);

    // Send initial status
    qualityService.getAllServicesStatus().then(services => {
      ws.send(
        JSON.stringify({
          type: 'initial_status',
          data: services,
          timestamp: new Date().toISOString(),
        })
      );
    });

    // Handle incoming messages
    ws.on('message', message => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', error => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

function handleClientMessage(ws, data) {
  switch (data.type) {
    case 'subscribe':
      ws.subscribedServices = data.services || [];
      console.log(`Client subscribed to: ${ws.subscribedServices.join(', ')}`);
      break;

    case 'unsubscribe':
      ws.subscribedServices = [];
      console.log('Client unsubscribed from all services');
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    default:
      console.log('Unknown message type:', data.type);
  }
}

// Broadcast to all clients
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === 1) {
      // OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// Broadcast to clients subscribed to a specific service
function broadcastToService(service, message) {
  clients.forEach(client => {
    if (
      client.readyState === 1 &&
      (!client.subscribedServices ||
        client.subscribedServices.length === 0 ||
        client.subscribedServices.includes(service))
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcast,
  broadcastToService,
};
