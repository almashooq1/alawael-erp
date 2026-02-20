/**
 * Simplified Server for SSO Testing
 */

require('dotenv').config();

// Set mock mode
process.env.USE_MOCK_DB = 'true';
process.env.USE_MOCK_CACHE = 'true';

const app = require('./app-sso');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║    🚀 SSO Backend Server (Simplified)      ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  📍 Health: http://localhost:${PORT}/health ║
║  🔐 SSO: http://localhost:${PORT}/api/sso  ║
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
