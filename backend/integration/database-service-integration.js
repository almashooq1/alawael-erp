/**
 * integration/database-service-integration.js
 * Integration Guide: Connecting Repository to Service Layer
 * 
 * This file explains how to integrate the database repository
 * with the existing supply chain service.
 */

const logger = require('../config/logger');

/**
 * INTEGRATION PATTERN
 * 
 * Before (Mock DB):
 * ┌─────────────┐
 * │   Routes    │
 * └──────┬──────┘
 *        │ service.createSupplier()
 * ┌──────▼──────┐
 * │   Service   │ ← uses Map data structure
 * └──────┬──────┘
 *        │ suppliers.set()
 * ┌──────▼──────┐
 * │  Mock Maps  │
 * └─────────────┘
 *
 * After (MongoDB):
 * ┌─────────────┐
 * │   Routes    │
 * └──────┬──────┘
 *        │ service.createSupplier()
 * ┌──────▼──────┐
 * │   Service   │ (can continue as-is or optimize)
 * └──────┬──────┘
 *        │ repository.createSupplier()
 * ┌──────▼──────────┐
 * │   Repository    │ ← new data abstraction layer
 * └──────┬──────────┘
 *        │ mongoose query
 * ┌──────▼──────┐
 * │  MongoDB    │ ← persistent storage
 * └─────────────┘
 */

/**
 * INTEGRATION STEP 1: UPDATE SERVICE LAYER
 * 
 * File: services/supplyChain.service.js
 * 
 * Add these imports at the top:
 */

const integrationStep1 = `
// At top of supplyChain.service.js
const repository = require('../repositories/supplyChainRepository');
const { USE_MOCK_DB } = process.env;
`;

/**
 * INTEGRATION STEP 2: UPDATE SUPPLIER OPERATIONS
 * 
 * Replace mock Map operations with repository calls
 */

const integrationStep2 = `
// BEFORE (Mock DB)
class SupplyChainService {
  constructor() {
    this.suppliers = new Map();
  }

  createSupplier(data) {
    const id = Date.now().toString();
    const supplier = { id, ...data };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  getSupplier(id) {
    return this.suppliers.get(id);
  }

  listSuppliers() {
    return Array.from(this.suppliers.values());
  }

  updateSupplier(id, data) {
    const supplier = this.suppliers.get(id);
    if (!supplier) throw new Error('Supplier not found');
    const updated = { ...supplier, ...data };
    this.suppliers.set(id, updated);
    return updated;
  }

  deleteSupplier(id) {
    this.suppliers.delete(id);
    return { success: true };
  }
}

// AFTER (MongoDB Repository)
class SupplyChainService {
  // Constructor no longer needs Map storage

  async createSupplier(data) {
    return await repository.createSupplier(data);
  }

  async getSupplier(id) {
    return await repository.getSupplier(id);
  }

  async listSuppliers(filters = {}) {
    return await repository.listSuppliers(filters);
  }

  async updateSupplier(id, data) {
    return await repository.updateSupplier(id, data);
  }

  async deleteSupplier(id) {
    return await repository.deleteSupplier(id);
  }
}
`;

/**
 * INTEGRATION STEP 3: HANDLE PROMISES AND ASYNC/AWAIT
 * 
 * Repository methods return Promises
 * Update routes to handle async operations
 */

const integrationStep3 = `
// BEFORE (Synchronous)
router.post('/suppliers', (req, res) => {
  try {
    const supplier = supplyChainService.createSupplier(req.body);
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// AFTER (Async/Await with await)
router.post('/suppliers', async (req, res) => {
  try {
    const supplier = await supplyChainService.createSupplier(req.body);
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
`;

/**
 * INTEGRATION STEP 4: TRANSACTION SUPPORT
 * 
 * For multi-step operations, use MongoDB sessions
 */

const integrationStep4 = `
// Services/supplyChain.service.js

const { mongoose } = require('../config/database');

async createPurchaseOrderWithShipment(orderData, shipmentData) {
  // Start session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create order
    const order = await repository.createPurchaseOrder(orderData);
    
    // Create associated shipment
    const shipment = await repository.createShipment({
      ...shipmentData,
      orderId: order._id
    });

    // Update inventory
    for (const item of orderData.items) {
      await repository.updateProductQuantity(
        item.productId,
        -item.quantity,
        \`PO: \${order.poNumber}\`
      );
    }

    // Commit transaction
    await session.commitTransaction();
    return { order, shipment };
  } catch (error) {
    // Rollback on error
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
`;

/**
 * INTEGRATION STEP 5: ERROR HANDLING
 * 
 * Repository throws Mongoose errors
 * Handle them appropriately
 */

const integrationStep5 = `
// Error handling in routes

router.post('/suppliers', async (req, res) => {
  try {
    const supplier = await supplyChainService.createSupplier(req.body);
    res.json({ success: true, data: supplier });
  } catch (error) {
    // Handle specific Mongoose errors
    if (error.code === 11000) {
      // Duplicate key error (e.g., email already exists)
      return res.status(409).json({ 
        error: 'Supplier with this email already exists' 
      });
    }

    if (error.name === 'ValidationError') {
      // Validation error from schema
      return res.status(400).json({
        error: 'Invalid supplier data',
        details: error.message
      });
    }

    // Generic error
    res.status(500).json({ 
      error: 'Failed to create supplier',
      message: error.message 
    });
  }
});
`;

/**
 * INTEGRATION STEP 6: CONNECTION INITIALIZATION
 * 
 * Update app.js to connect to database on startup
 */

const integrationStep6 = `
// app.js

const { connectDB, watchConnectionEvents, testConnection } = require('./config/database');
const routes = require('./routes');

const startServer = async () => {
  try {
    // Connect to database
    logger.info('Initializing database connection...');
    await connectDB();
    watchConnectionEvents();

    // Test connection
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      logger.error('Database connection test failed, using fallback');
    }

    // Seed initial data if needed
    if (process.env.SEED_DATABASE === 'true') {
      const { seedData } = require('./seeds/initDatabase');
      logger.info('Seeding database...');
      await seedData();
      logger.info('Seeding completed');
    }

    // Initialize routes
    app.use('/api', routes);

    // Start listening
    app.listen(PORT, () => {
      logger.info(\`✅ Server running on port \${PORT}\`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
`;

/**
 * INTEGRATION STEP 7: MIGRATION CHECKLIST
 * 
 * Verify each step before proceeding
 */

const integrationChecklist = [
  {
    step: 1,
    title: 'Add Repository Imports',
    description: 'Import repository in service layer',
    verification: 'grep -r "repository.create" services/',
  },
  {
    step: 2,
    title: 'Update Service Methods',
    description: 'Replace Map.set/get with repository calls',
    verification: 'Check all service methods use await/async',
  },
  {
    step: 3,
    title: 'Update Routes',
    description: 'Make route handlers async',
    verification: 'grep -r "async (req, res)" routes/',
  },
  {
    step: 4,
    title: 'Add Database Connection',
    description: 'Initialize MongoDB in app.js',
    verification: 'npm start shows "MongoDB connected"',
  },
  {
    step: 5,
    title: 'Test Endpoints',
    description: 'Verify all endpoints return data from MongoDB',
    verification: 'curl http://localhost:3001/api/supply-chain/suppliers',
  },
  {
    step: 6,
    title: 'Seed Database',
    description: 'Populate initial test data',
    verification: 'curl shows 4+ suppliers in response',
  },
  {
    step: 7,
    title: 'Run Tests',
    description: 'Verify all tests pass with MongoDB',
    verification: 'npm test shows all green',
  },
  {
    step: 8,
    title: 'Performance Verification',
    description: 'Check response times are acceptable',
    verification: 'Response time < 500ms for most queries',
  },
];

/**
 * INTEGRATION TEST SCRIPT
 * 
 * Run this to verify integration
 */

const integrationTestScript = `
#!/bin/bash
# scripts/test-db-integration.sh

echo "🧪 Testing Database Integration..."

# 1. Check database connection
echo "1️⃣  Testing database connection..."
curl http://localhost:3001/api/supply-chain/status

# 2. Get supplier count
echo "\\n2️⃣  Checking supplier count..."
curl http://localhost:3001/api/supply-chain/suppliers | jq '.data | length'

# 3. Get product count
echo "\\n3️⃣  Checking product count..."
curl http://localhost:3001/api/supply-chain/products | jq '.data | length'

# 4. Get order count
echo "\\n4️⃣  Checking order count..."
curl http://localhost:3001/api/supply-chain/purchase-orders | jq '.data | length'

# 5. Test create operation
echo "\\n5️⃣  Testing create operation..."
curl -X POST http://localhost:3001/api/supply-chain/suppliers \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Integration Test Supplier",
    "email": "test@integration.com",
    "category": "electronics"
  }' | jq '.success'

echo "\\n✅ Integration tests completed!"
`;

/**
 * CONNECTION STRING PATTERNS
 */

const connectionStrings = {
  development_local: 'mongodb://localhost:27017/erp_system',
  development_docker: 'mongodb://mongodb:27017/erp_system',
  production_atlas: 'mongodb+srv://username:password@cluster.mongodb.net/erp_system?retryWrites=true&w=majority',
  test: 'mongodb://localhost:27017/erp_test',
};

/**
 * ENVIRONMENT VARIABLES TEMPLATE
 */

const envTemplate = `
# .env

# Database Configuration
NODE_ENV=development
USE_MOCK_DB=false
MONGODB_URI=mongodb://localhost:27017/erp_system
DB_NAME=erp_system
SEED_DATABASE=true

# Server Configuration
PORT=3001
SSO_PORT=3002
CORS_ORIGIN=http://localhost:3000

# Security
JWT_SECRET=your_secret_key_here_min_32_chars
JWT_EXPIRY=7d

# Logging
LOG_LEVEL=info
USE_MOCK_CACHE=false

# Features
ENABLE_TRANSACTIONS=true
ENABLE_INDEXING=true
`;

/**
 * COMMON INTEGRATION ISSUES AND SOLUTIONS
 */

const commonIssues = [
  {
    issue: 'Cannot find module "repository"',
    solution: 'Ensure repository path is correct: ../repositories/supplyChainRepository',
  },
  {
    issue: 'Await is not supported',
    solution: 'Make sure route handler is declared as async: async (req, res) => {}',
  },
  {
    issue: 'MongoDB connection timeout',
    solution: 'Check MongoDB is running, or set USE_MOCK_DB=true in .env',
  },
  {
    issue: 'Duplicate key error on email',
    solution: 'Supplier with this email exists, handle in error handler with 409 status',
  },
  {
    issue: 'Data appears as [Object Object]',
    solution: 'Use JSON.stringify() or toObject() method on Mongoose documents',
  },
  {
    issue: 'Tests still using Mock DB',
    solution: 'Set USE_MOCK_DB=false in .env.test',
  },
];

module.exports = {
  // Integration guides
  integrationStep1,
  integrationStep2,
  integrationStep3,
  integrationStep4,
  integrationStep5,
  integrationStep6,

  // Resources
  integrationChecklist,
  integrationTestScript,
  connectionStrings,
  envTemplate,
  commonIssues,
};
