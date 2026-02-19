/**
 * Finance Module Bootstrap Integration
 * Mounts all finance module routes to main Express server
 * 
 * Usage: Call initializeFinanceModule(app) from main server
 */

const path = require('path');

/**
 * Initialize Finance Module Routes
 * @param {Express.Application} app - Express application instance
 * @param {Object} options - Configuration options
 */
async function initializeFinanceModule(app, options = {}) {
  const { 
    baseUrl = '/api/finance',
    authMiddleware = null,
    rbacMiddleware = null,
    enableWebSocket = true,
    logger = console 
  } = options;

  try {
    logger.log('[💰 Finance Module] Starting initialization...');

    // Load route handlers
    const validationRoutes = require('../routes/validation');
    const cashFlowRoutes = require('../routes/cashFlow');
    const riskRoutes = require('../routes/risk');
    const financeModuleProxy = require('../routes/financeModule');

    // Mount validation routes
    const validationPath = `${baseUrl}/validation`;
    if (authMiddleware && rbacMiddleware) {
      app.use(validationPath, authMiddleware, rbacMiddleware, validationRoutes);
    } else {
      app.use(validationPath, validationRoutes);
    }
    logger.log(`✅ Validation routes mounted at ${validationPath}`);

    // Mount cash flow routes
    const cashFlowPath = `${baseUrl}/cashflow`;
    if (authMiddleware && rbacMiddleware) {
      app.use(cashFlowPath, authMiddleware, rbacMiddleware, cashFlowRoutes);
    } else {
      app.use(cashFlowPath, cashFlowRoutes);
    }
    logger.log(`✅ Cash Flow routes mounted at ${cashFlowPath}`);

    // Mount risk routes
    const riskPath = `${baseUrl}/risk`;
    if (authMiddleware && rbacMiddleware) {
      app.use(riskPath, authMiddleware, rbacMiddleware, riskRoutes);
    } else {
      app.use(riskPath, riskRoutes);
    }
    logger.log(`✅ Risk routes mounted at ${riskPath}`);

    // Mount module aggregator
    if (authMiddleware && rbacMiddleware) {
      app.use(baseUrl, authMiddleware, rbacMiddleware, financeModuleProxy);
    } else {
      app.use(baseUrl, financeModuleProxy);
    }
    logger.log(`✅ Finance Module aggregator mounted at ${baseUrl}`);

    // Setup real-time WebSocket support
    if (enableWebSocket && app.io) {
      setupFinanceWebSocket(app.io, logger);
    }

    // Health check endpoint
    app.get(`${baseUrl}/health`, (req, res) => {
      res.json({
        status: 'healthy',
        module: 'finance',
        timestamp: new Date().toISOString(),
        endpoints: [
          `${baseUrl}/validation`,
          `${baseUrl}/cashflow`,
          `${baseUrl}/risk`
        ]
      });
    });
    logger.log(`✅ Health check available at ${baseUrl}/health`);

    logger.log('🎉 Finance Module initialization complete!');
    return true;
  } catch (error) {
    logger.error('[❌ Finance Module] Initialization failed:', error);
    throw error;
  }
}

/**
 * Setup WebSocket handlers for real-time finance updates
 * @param {SocketIO} io - Socket.IO instance
 * @param {Object} logger - Logger instance
 */
function setupFinanceWebSocket(io, logger) {
  try {
    const financeNamespace = io.of('/finance');

    financeNamespace.on('connection', (socket) => {
      logger.log(`[Finance WebSocket] User ${socket.id} connected`);

      // Subscribe to violations updates
      socket.on('subscribe:violations', (data) => {
        socket.join(`violations:${data.userId}`);
        socket.emit('subscribed', { channel: 'violations' });
      });

      // Subscribe to cash flow updates
      socket.on('subscribe:cashflow', (data) => {
        socket.join(`cashflow:${data.userId}`);
        socket.emit('subscribed', { channel: 'cashflow' });
      });

      // Subscribe to risk matrix updates
      socket.on('subscribe:risks', (data) => {
        socket.join(`risks:${data.userId}`);
        socket.emit('subscribed', { channel: 'risks' });
      });

      // Broadcast newly detected violations
      socket.on('violation:created', (data) => {
        financeNamespace.to(`violations:${data.userId}`).emit('violation:new', data);
      });

      // Broadcast cash flow updates
      socket.on('cashflow:updated', (data) => {
        financeNamespace.to(`cashflow:${data.userId}`).emit('cashflow:change', data);
      });

      // Broadcast risk changes
      socket.on('risk:updated', (data) => {
        financeNamespace.to(`risks:${data.userId}`).emit('risk:change', data);
      });

      socket.on('disconnect', () => {
        logger.log(`[Finance WebSocket] User ${socket.id} disconnected`);
      });
    });

    logger.log('[✅ Finance WebSocket] Real-time namespace initialized');
  } catch (error) {
    logger.error('[⚠️ Finance WebSocket] Setup failed (non-critical):', error.message);
  }
}

/**
 * Get Finance Module Status
 * @returns {Object} Status report
 */
function getFinanceModuleStatus() {
  return {
    module: 'Finance System',
    version: '1.0.0',
    status: 'active',
    components: {
      validation: { status: 'operational', endpoints: 8 },
      cashFlow: { status: 'operational', endpoints: 8 },
      risk: { status: 'operational', endpoints: 9 },
    },
    features: [
      'Compliance Violation Tracking',
      'Cash Flow Forecasting',
      'Risk Assessment Matrix',
      'Real-time WebSocket Updates',
      'Advanced Analytics'
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Export methods for external use
 */
module.exports = {
  initializeFinanceModule,
  setupFinanceWebSocket,
  getFinanceModuleStatus
};
