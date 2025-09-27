import express from 'express';
import cors from 'cors';
import http from 'http';
import { poolService } from './services/pools';
import { startPriceWebSocketServer } from './services/websocket';
import { orderExecutionService } from './services/orders';
import { db } from './database';
import { POOL_PAIRS } from './config/constants';

// Import routes
import userRoutes from './routes/users';
import poolRoutes from './routes/pools';
import orderRoutes from './routes/orders';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', userRoutes);
app.use('/api', poolRoutes);
app.use('/api', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize services
async function initializeServices() {
  try {
    console.log('[App] Initializing services...');
    
    // Initialize pool data
    console.log('[App] Fetching initial pool data...');
    const initialPools = await poolService.fetchPoolsData(POOL_PAIRS);
    db.setPools(initialPools);
    console.log(`[App] Initialized ${initialPools.length} pools`);

    // Start WebSocket price service
    console.log('[App] Starting WebSocket service...');
    const wsService = startPriceWebSocketServer(server, POOL_PAIRS);
    
    // Start order execution service
    console.log('[App] Starting order execution service...');
    orderExecutionService.startOrderMonitoring();

    // Set up periodic pool data updates (every 10 minutes)
    setInterval(async () => {
      try {
        console.log('[App] Updating pool data...');
        const updatedPools = await poolService.fetchPoolsData(POOL_PAIRS);
        db.setPools(updatedPools);
        console.log(`[App] Updated ${updatedPools.length} pools`);
      } catch (error) {
        console.error('[App] Failed to update pools:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('[App] All services initialized successfully');
    
  } catch (error) {
    console.error('[App] Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
server.listen(PORT, async () => {
  console.log(`[App] Server running on port ${PORT}`);
  console.log(`[App] WebSocket server available for real-time price updates`);
  console.log(`[App] API endpoints:`);
  console.log(`[App]   POST /api/users - Create user`);
  console.log(`[App]   POST /api/users/:id/nonce-account - Get nonce account transaction`);
  console.log(`[App]   PUT /api/users/:id/nonce-account - Add nonce account to user`);
  console.log(`[App]   GET /api/pools - Get all pools`);
  console.log(`[App]   POST /api/orders - Create order`);
  console.log(`[App]   GET /api/users/:userId/orders - Get user orders`);
  
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[App] SIGTERM received, shutting down gracefully');
  orderExecutionService.stopOrderMonitoring();
  server.close(() => {
    console.log('[App] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[App] SIGINT received, shutting down gracefully');
  orderExecutionService.stopOrderMonitoring();
  server.close(() => {
    console.log('[App] Server closed');
    process.exit(0);
  });
});