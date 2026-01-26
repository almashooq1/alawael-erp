/**
 * Supply & Support System Integration Example
 * نمودج تكامل نظام الإمداد والمساندة
 */

// ===============================================
// Step 1: Import Required Modules
// ===============================================

const express = require('express');
const SupplySupportSystem = require('./backend/lib/supply_support_system');
const supplyRoutes = require('./backend/routes/supply_support_routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ===============================================
// Step 2: Middleware Setup
// ===============================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// ===============================================
// Step 3: Initialize Supply System
// ===============================================

const supplySystem = new SupplySupportSystem();
console.log('✅ Supply & Support System Initialized');
console.log(`   - Branches: ${supplySystem.getAllBranches().length}`);
console.log(`   - System Status: ${supplySystem.getSystemStatistics().status}`);

// ===============================================
// Step 4: Mount Supply Routes
// ===============================================

app.use('/api/supply', supplyRoutes);
console.log('✅ Supply Routes Mounted');
console.log('   - Path: /api/supply/*');
console.log('   - Endpoints: 15+');

// ===============================================
// Step 5: Health Check Endpoint
// ===============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'Supply & Support System',
    version: '4.0.0',
    timestamp: new Date().toISOString()
  });
});

// ===============================================
// Step 6: System Status Dashboard
// ===============================================

app.get('/dashboard', (req, res) => {
  try {
    const stats = supplySystem.getSystemStatistics();
    const branches = supplySystem.getAllBranches();
    
    const dashboard = {
      system: {
        status: 'Active',
        version: '4.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      overview: {
        total_branches: stats.total_branches,
        total_requests: stats.total_requests,
        total_transfers: stats.total_transfers,
        pending_requests: stats.pending_requests,
        in_transit_transfers: stats.in_transit_transfers,
        open_tickets: stats.open_tickets
      },
      branches: branches.map(b => ({
        id: b.id,
        name: b.name,
        inventory_items: supplySystem.calculateInventoryTotal(b.inventory),
        capacity_used: b.inventory_space
      })),
      api_endpoints: {
        base: '/api/supply',
        system: ['/system-status', '/health'],
        branches: ['/branches', '/branches/:id', '/branches/:id/metrics', '/branches/:id/report'],
        requests: ['/requests', '/requests/:id/approve'],
        transfers: ['/transfers', '/transfers/:id'],
        tickets: ['/tickets', '/tickets/:id/comments', '/tickets/:id/resolve']
      }
    };
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({
      error: 'Dashboard Error',
      message: error.message
    });
  }
});

// ===============================================
// Step 7: Example API Handlers
// ===============================================

// Example: Create Supply Request with validation
app.post('/example/create-request', express.json(), (req, res) => {
  try {
    const { fromBranch, toBranch, items, priority } = req.body;
    
    // Validation
    if (!fromBranch || !toBranch || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }
    
    // Create request
    const request = supplySystem.createSupplyRequest(
      fromBranch,
      toBranch,
      items,
      priority || 'normal'
    );
    
    res.status(201).json({
      success: true,
      message: 'Supply request created successfully',
      request: request,
      next_step: `POST /api/supply/requests/${request.id}/approve`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Request Creation Failed',
      message: error.message
    });
  }
});

// Example: Track Transfer Status
app.get('/example/track-transfer/:transferId', (req, res) => {
  try {
    const { transferId } = req.params;
    
    // Find transfer in system
    const transfers = Array.from(supplySystem.transfers.values());
    const transfer = transfers.find(t => t.id === transferId);
    
    if (!transfer) {
      return res.status(404).json({
        error: 'Transfer not found'
      });
    }
    
    res.json({
      success: true,
      transfer_id: transfer.id,
      status: transfer.status,
      tracking_code: transfer.tracking_code,
      from_branch: transfer.from_branch,
      to_branch: transfer.to_branch,
      items_count: transfer.items.length,
      total_amount: transfer.total_amount,
      created_at: transfer.created_at,
      last_updated: transfer.last_updated,
      estimated_delivery: transfer.estimated_delivery
    });
  } catch (error) {
    res.status(500).json({
      error: 'Tracking Failed',
      message: error.message
    });
  }
});

// Example: Branch Metrics
app.get('/example/branch-metrics/:branchId', (req, res) => {
  try {
    const { branchId } = req.params;
    const metrics = supplySystem.getBranchMetrics(branchId);
    
    if (!metrics || metrics.error) {
      return res.status(404).json({
        error: 'Branch not found or error calculating metrics'
      });
    }
    
    res.json({
      success: true,
      branch_id: branchId,
      metrics: metrics
    });
  } catch (error) {
    res.status(500).json({
      error: 'Metrics Calculation Failed',
      message: error.message
    });
  }
});

// ===============================================
// Step 8: Error Handler Middleware
// ===============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// ===============================================
// Step 9: 404 Handler
// ===============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    available: {
      dashboard: '/dashboard',
      health: '/health',
      api: '/api/supply/*'
    }
  });
});

// ===============================================
// Step 10: Server Startup
// ===============================================

app.listen(PORT, () => {
  console.log('\n✅ Supply & Support System Started');
  console.log(`   Port: ${PORT}`);
  console.log(`   Version: 4.0.0`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);
  
  console.log('📊 Available Endpoints:');
  console.log('   Health: GET /health');
  console.log('   Dashboard: GET /dashboard');
  console.log('   API: GET /api/supply/*');
  console.log('   Examples: /example/*\n');
  
  console.log('🔗 Quick Links:');
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   System Status: http://localhost:${PORT}/api/supply/system-status`);
  console.log(`   Branches: http://localhost:${PORT}/api/supply/branches\n`);
});

// ===============================================
// Optional: Graceful Shutdown
// ===============================================

process.on('SIGTERM', () => {
  console.log('\n⛔ Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Supply System stopped');
    process.exit(0);
  });
});

module.exports = app;
