const app = require('./app');
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║    🚀 ERP System Backend Server          ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  📍 Health check: http://localhost:${PORT}/health  ║
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
