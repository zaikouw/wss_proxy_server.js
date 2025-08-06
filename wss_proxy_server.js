const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// WebSocket server for secure connections
const wss = new WebSocketServer({ server });

// Enable CORS
app.use(cors({
  origin: ['https://business.hesett.com', 'http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));

// Store active connections
const connections = new Map();

// Configuration
const ESP32_TARGETS = [
  '192.168.58.108:81',  // Current ESP32 IP (prioritized)
  '192.168.58.100:81',
  '192.168.58.115:81', 
  '192.168.58.113:81',
  '192.168.58.114:81',
  '192.168.1.100:81',
  '192.168.0.100:81',
  '192.168.4.1:81',
  'd0e962e417ed.ngrok-free.app:443'  // ESP32 via ngrok tunnel (HTTP port 80)
];

const ESP32_HTTP_TARGETS = [
  '192.168.58.108:80',  // Current ESP32 IP (prioritized)
  '192.168.58.100:80',
  '192.168.58.115:80',
  '192.168.58.113:80', 
  '192.168.58.114:80',
  '192.168.1.100:80',
  '192.168.0.100:80',
  '192.168.4.1:80',
  'd0e962e417ed.ngrok-free.app:443'  // ESP32 via ngrok tunnel (HTTP port 80)
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'WSS Proxy Server Running',
    timestamp: new Date().toISOString(),
    connections: connections.size,
    targets: ESP32_TARGETS
  });
});

// ESP32 discovery endpoint
app.get('/discover', async (req, res) => {
  try {
    const discoveredDevices = [];
    
    // Test WebSocket connections
    for (const target of ESP32_TARGETS) {
      try {
        const [host, port] = target.split(':');
        const isReachable = await testWebSocketConnection(host, parseInt(port));
        if (isReachable) {
          discoveredDevices.push({
            type: 'websocket',
            target: target,
            status: 'reachable'
          });
        }
      } catch (error) {
        console.log(`❌ WebSocket test failed for ${target}:`, error.message);
      }
    }
    
    // Test HTTP connections
    for (const target of ESP32_HTTP_TARGETS) {
      try {
        const [host, port] = target.split(':');
        const isReachable = await testHttpConnection(host, parseInt(port));
        if (isReachable) {
          discoveredDevices.push({
            type: 'http',
            target: target,
            status: 'reachable'
          });
        }
      } catch (error) {
        console.log(`❌ HTTP test failed for ${target}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      devices: discoveredDevices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test WebSocket connection
async function testWebSocketConnection(host, port) {
  return new Promise((resolve) => {
    const WebSocket = require('ws');
    const ws = new WebSocket(`ws://${host}:${port}`);
    
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve(false);
    }, 2000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// Test HTTP connection
async function testHttpConnection(host, port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: host,
      port: port,
      path: '/status',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const connectionId = Date.now() + Math.random();
  console.log(`🔌 New WSS connection: ${connectionId}`);
  
  connections.set(connectionId, {
    ws: ws,
    esp32Connection: null,
    target: null
  });
  
  // Handle incoming messages from Flutter app
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📡 Received message from Flutter:`, data);
      
      // Handle different message types
      if (data.command === 'discover') {
        await handleDiscover(connectionId, ws);
      } else if (data.command === 'connect') {
        await handleConnect(connectionId, ws, data.target);
      } else if (data.command === 'send') {
        await handleSend(connectionId, ws, data);
      } else {
        // Forward message to ESP32
        await forwardToEsp32(connectionId, ws, data);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 WSS connection closed: ${connectionId}`);
    const connection = connections.get(connectionId);
    if (connection && connection.esp32Connection) {
      connection.esp32Connection.close();
    }
    connections.delete(connectionId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WSS connection error: ${connectionId}`, error);
    connections.delete(connectionId);
  });
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    connectionId: connectionId,
    timestamp: new Date().toISOString()
  }));
});

// Handle discover command
async function handleDiscover(connectionId, ws) {
  console.log(`🔍 Handling discover for connection: ${connectionId}`);
  
  const discoveredDevices = [];
  
  // Test WebSocket connections
  for (const target of ESP32_TARGETS) {
    try {
      const [host, port] = target.split(':');
      const isReachable = await testWebSocketConnection(host, parseInt(port));
      if (isReachable) {
        discoveredDevices.push({
          type: 'websocket',
          target: target,
          status: 'reachable'
        });
      }
    } catch (error) {
      console.log(`❌ WebSocket test failed for ${target}:`, error.message);
    }
  }
  
  // Test HTTP connections
  for (const target of ESP32_HTTP_TARGETS) {
    try {
      const [host, port] = target.split(':');
      const isReachable = await testHttpConnection(host, parseInt(port));
      if (isReachable) {
        discoveredDevices.push({
          type: 'http',
          target: target,
          status: 'reachable'
        });
      }
    } catch (error) {
      console.log(`❌ HTTP test failed for ${target}:`, error.message);
    }
  }
  
  ws.send(JSON.stringify({
    type: 'discovery_result',
    devices: discoveredDevices,
    timestamp: new Date().toISOString()
  }));
}

// Handle connect command
async function handleConnect(connectionId, ws, target) {
  console.log(`🔌 Handling connect for connection: ${connectionId} to ${target}`);
  
  try {
    const connection = connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    // Try to connect to ESP32
    const [host, port] = target.split(':');
    const esp32Ws = new (require('ws'))(`ws://${host}:${port}`);
    
    esp32Ws.on('open', () => {
      console.log(`✅ Connected to ESP32: ${target}`);
      connection.esp32Connection = esp32Ws;
      connection.target = target;
      
      ws.send(JSON.stringify({
        type: 'esp32_connected',
        target: target,
        timestamp: new Date().toISOString()
      }));
    });
    
    esp32Ws.on('message', (data) => {
      console.log(`📡 ESP32 message:`, data.toString());
      ws.send(data.toString());
    });
    
    esp32Ws.on('close', () => {
      console.log(`🔌 ESP32 connection closed: ${target}`);
      connection.esp32Connection = null;
      connection.target = null;
      
      ws.send(JSON.stringify({
        type: 'esp32_disconnected',
        target: target,
        timestamp: new Date().toISOString()
      }));
    });
    
    esp32Ws.on('error', (error) => {
      console.error(`❌ ESP32 connection error: ${target}`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to connect to ESP32: ${error.message}`
      }));
    });
    
  } catch (error) {
    console.error('❌ Error connecting to ESP32:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Handle send command
async function handleSend(connectionId, ws, data) {
  console.log(`📤 Handling send for connection: ${connectionId}`);
  
  const connection = connections.get(connectionId);
  if (!connection || !connection.esp32Connection) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not connected to ESP32'
    }));
    return;
  }
  
  try {
    connection.esp32Connection.send(JSON.stringify(data.payload));
    ws.send(JSON.stringify({
      type: 'message_sent',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('❌ Error sending to ESP32:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Forward message to ESP32
async function forwardToEsp32(connectionId, ws, data) {
  const connection = connections.get(connectionId);
  if (!connection || !connection.esp32Connection) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not connected to ESP32'
    }));
    return;
  }
  
  try {
    connection.esp32Connection.send(JSON.stringify(data));
  } catch (error) {
    console.error('❌ Error forwarding to ESP32:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 WSS Proxy Server running on port ${PORT}`);
  console.log(`🔒 Secure WebSocket endpoint: wss://your-domain.com`);
  console.log(`📡 ESP32 targets:`, ESP32_TARGETS);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Discovery: http://localhost:${PORT}/discover`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down WSS Proxy Server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); // Updated: Wed Aug  6 17:10:28 -05 2025
// Force redeploy: Wed Aug  6 17:17:06 -05 2025 - ngrok tunnel fix
// Force redeploy: Wed Aug  6 17:26:21 -05 2025 - ngrok command mapping fix
// Force redeploy: Wed Aug  6 17:27:43 -05 2025 - form-urlencoded fix for restaurant_id
// Force redeploy: Wed Aug  6 17:33:16 -05 2025 - Added comprehensive debugging logs
// Force redeploy: Wed Aug  6 17:35:37 -05 2025 - Auto-redirect local IPs to ngrok tunnel
