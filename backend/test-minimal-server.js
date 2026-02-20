require('dotenv').config();

// Use mock database for testing
process.env.USE_MOCK_DB = 'true';
process.env.USE_MOCK_CACHE = 'true';

const express = require('express');
const { connectDB } = require('./config/database');
const app = express();

app.use(express.json());

// Import ONLY the supply chain router
const supplyChainRouter = require('./routes/supplyChain.routes');

// Initialize database first
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing mock database...');
    await connectDB();
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database init failed:', error.message);
    throw error;
  }
};

// Mount it
console.log('Mounting supply chain router...');
app.use('/api/supply-chain', supplyChainRouter);
console.log('✅ Supply chain router mounted');

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Start
const PORT = 3009;

initializeDatabase().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Minimal test server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n✅ Shutting down');
    server.close(() => process.exit(0));
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
