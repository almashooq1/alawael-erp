require('dotenv').config();

// Default to local-friendly settings so the server starts even without Mongo/Redis
process.env.USE_MOCK_DB = process.env.USE_MOCK_DB || 'true';
process.env.USE_MOCK_CACHE = process.env.USE_MOCK_CACHE || 'true';

const app = require('./app');
const { connectDB } = require('./config/database');
const websocketService = require('./services/websocket.service');
const { seedData } = require('./seeds/initDatabase');
const { Supplier } = require('./models');

const PORT = process.env.PORT || 3001;

// Initialize database with optional seeding
const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected successfully');

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
