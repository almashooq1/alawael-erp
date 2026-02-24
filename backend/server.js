// ============================================
// 🔍 DYNATRACE ONEAGENT INITIALIZATION
// ============================================
// يجب أن يكون هذا أول سطر في الملف
try {
  const oneAgent = require('@dynatrace/oneagent-sdk');
  if (oneAgent && typeof oneAgent.init === 'function') {
    oneAgent.init();
    console.log('✅ Dynatrace OneAgent Initialized');
  }
} catch (error) {
  console.warn('⚠️  Dynatrace SDK not fully initialized:', error.message);
}
// ============================================

require('dotenv').config();

// Default to local-friendly settings so the server starts even without Mongo/Redis
process.env.USE_MOCK_DB = process.env.USE_MOCK_DB || 'true';
process.env.USE_MOCK_CACHE = process.env.USE_MOCK_CACHE || 'true';

const app = require('./app');
const { connectDB, getConnectionHealth } = require('./config/database');
const websocketService = require('./services/websocket.service');
const { seedData } = require('./seeds/initDatabase');
const { Supplier } = require('./models');
const resourceManager = require('./utils/resource-manager');
const memoryOptimizer = require('./utils/memory-optimizer');
const connectionPoolManager = require('./utils/connection-pool-manager');
const WebSocketEnhancements = require('./utils/websocket-enhancements');
const databaseEnhancements = require('./utils/database-enhancements');
const LogManager = require('./utils/log-manager');

const PORT = process.env.PORT || 3001;

let wsEnhancements = null;
let logManager = null;

// Initialize database with optional seeding
const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    const dbConnection = await connectDB();
    console.log('✅ Database connected successfully');
    
    // Initialize database enhancements
    databaseEnhancements.initializeMonitoring(dbConnection);
    databaseEnhancements.enableConnectionRecycling();
    console.log('✅ Database enhancements activated');

    // Skip seeding if using mock database
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('📦 Using Mock Database - Skipping MongoDB seeding');
      return true;
    }

    // Check if database needs seeding (only for real MongoDB)
    const supplierCount = await Supplier.countDocuments();
    
    if (supplierCount === 0 && process.env.SEED_DATABASE !== 'false') {
      console.log('📊 Database is empty, seeding initial data...');
      await seedData();
      console.log('✅ Database seeded successfully');
    } else if (supplierCount > 0) {
      console.log(`📦 Database already initialized with ${supplierCount} suppliers`);
    }

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

// Start server
initializeDatabase()
  .then(() => {
    // 🇸🇦 Direct MOI routes registration
    const MOIPassportService = require('./services/moi-passport.service');
    const moiService = new MOIPassportService();
    
    app.get('/api/moi/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        service: 'MOI Passport Integration Service',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    console.log('✅ Direct MOI health route registered on POST /api/moi/health');
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      // Initialize WebSocket after HTTP server starts
      websocketService.initialize(server);
      
      // Initialize WebSocket enhancements
      wsEnhancements = new WebSocketEnhancements(websocketService);
      connectionPoolManager.startAutoCleanup();
      console.log('✅ Connection pooling and WebSocket optimization activated');
      
      // Initialize log management
      logManager = new LogManager({
        logDir: process.env.LOG_DIR || './logs',
        maxFileSize: 10 * 1024 * 1024, // 10 MB
        maxDays: 7,
        compressOldLogs: true,
      });
      logManager.startMonitoring();
      console.log('✅ Log rotation and management activated');
      
      // Start resource management
      resourceManager.startAutoCleanup();
      memoryOptimizer.startMonitoring();

      console.log(`
╔════════════════════════════════════════════╗
║    🚀 ERP System Backend Server          ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  ✅ Database connected & initialized       ║
║  ✅ WebSocket enabled                      ║
║  ✅ MOI Passport routes registered         ║
║  📍 Health check: http://localhost:${PORT}/health  ║
║  🇸🇦 MOI Health: http://localhost:${PORT}/api/moi/health  ║
║  🔌 API Base: http://localhost:${PORT}/api   ║
╚════════════════════════════════════════════╝
    `);
    });

    process.on('SIGINT', () => {
      console.log('\n📴 Shutting down gracefully...');
      
      // Clean up all resources
      resourceManager.cleanup();
      memoryOptimizer.stop();
      databaseEnhancements.cleanup();
      connectionPoolManager.cleanup();
      if (wsEnhancements) {
        wsEnhancements.cleanup();
      }
      if (logManager) {
        logManager.cleanup();
      }
      
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  })
  .catch(error => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });
