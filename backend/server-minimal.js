require('dotenv').config();

// Force mock database for testing
process.env.USE_MOCK_DB = 'true';
process.env.USE_MOCK_CACHE = 'true';
process.env.SEED_DATABASE = 'false';

const PORT = process.env.PORT || 3001;

// Create a minimal Express app
const express = require('express');
const app = express();

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints 
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ERP Backend' });
});

app.get('/api/moi/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'MOI Integration',
    version: '3.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running', uptime: process.uptime() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║    🚀 ERP System Backend Server          ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  ✅ Health check: http://localhost:${PORT}/health  ║
║  ✅ Mock DB enabled (testing mode)        ║
║  📍 API Base: http://localhost:${PORT}/api   ║
╚════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n📴 Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
