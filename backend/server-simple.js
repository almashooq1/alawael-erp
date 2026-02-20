require('dotenv').config();

// Default to local-friendly settings
process.env.USE_MOCK_DB = process.env.USE_MOCK_DB || 'true';
process.env.USE_MOCK_CACHE = process.env.USE_MOCK_CACHE || 'true';

const app = require('./app');
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 3001;

// Connect to database
connectDB()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════╗
║    🚀 ERP System Backend Server          ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  ✅ Database connected                     ║
║  ✅ Ready to accept requests               ║
║  📍 Health check: http://localhost:${PORT}/api/health  ║
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

    // Handle unhandled promise rejections
    process.on('unhandledRejection', error => {
      console.error('❌ Unhandled Promise Rejection:', error);
    });
  })
  .catch(error => {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
