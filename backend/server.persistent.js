require('dotenv').config();

// Force mock DB for quick startup
process.env.USE_MOCK_DB = 'true';
process.env.USE_MOCK_CACHE = 'true';

const app = require('./app');
const { connectDB } = require('./config/database');
const websocketService = require('./services/websocket.service');

const PORT = process.env.PORT || 3001;

console.log('\n🔵 Starting ERP Backend in PERSISTENT mode...\n');

// Disable SIGINT handler temporarily to prevent accidental shutdowns
let isShuttingDown = false;
let startupComplete = false;

// Connect to database
connectDB()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      // Initialize WebSocket after HTTP server starts
      websocketService.initialize(server);

      console.log(`
╔════════════════════════════════════════════╗
║    🚀 ERP Backend - PERSISTENT MODE      ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  ✅ Database: Mock (Development)           ║
║  ✅ WebSocket enabled                      ║
║  📍 Health: http://localhost:${PORT}/api/health ║
║  🔐 Protected from auto-shutdown           ║
╚════════════════════════════════════════════╝
      `);

      startupComplete = true;
      console.log('⏱️  Server will stay running. Press Ctrl+C twice to exit.\n');
    });

    // Custom SIGINT handler - requires double press
    let sigintCount = 0;
    process.on('SIGINT', () => {
      if (isShuttingDown) {
        return;
      }

      sigintCount++;

      if (sigintCount === 1) {
        console.log('\n⚠️  Press Ctrl+C again to confirm shutdown...');
        setTimeout(() => {
          sigintCount = 0;
        }, 3000);
        return;
      }

      console.log('\n📴 Shutting down gracefully...');
      isShuttingDown = true;

      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    // Prevent unhandled errors from crashing
    process.on('uncaughtException', error => {
      console.error('❌ Uncaught Exception:', error.message);
      if (!startupComplete) {
        console.error('💥 Error during startup, exiting...');
        process.exit(1);
      } else {
        console.log('⚠️  Continuing to run despite error...');
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection:', reason);
      if (!startupComplete) {
        console.error('💥 Error during startup, exiting...');
        process.exit(1);
      } else {
        console.log('⚠️  Continuing to run despite error...');
      }
    });
  })
  .catch(error => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });
