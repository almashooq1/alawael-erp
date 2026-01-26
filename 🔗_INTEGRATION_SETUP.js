/**
 * 🎯 Integration Setup Guide
 * How to integrate Intelligent System into your Express server
 * Date: January 22, 2026
 */

// ============================================================================
// Step 1: Add these imports to your server.js
// ============================================================================

const { getSmartSystem } = require('./lib/smart-integration');
const { getIntelligenceEngine } = require('./lib/intelligence-engine');
const { SmartAutomation } = require('./lib/smart-automation');
const { AdvancedAnalytics } = require('./lib/advanced-analytics');
const { SmartUIEngine } = require('./lib/smart-ui-engine');

// ============================================================================
// Step 2: Initialize Intelligent System (after app creation)
// ============================================================================

async function initializeIntelligentSystem(app) {
  console.log('\n🧠 Initializing Intelligent System...\n');

  try {
    // Get the unified smart system
    const smartSystem = getSmartSystem();

    // Initialize all subsystems
    const initialized = await smartSystem.initialize();

    if (!initialized) {
      console.error('❌ Failed to initialize smart system');
      return false;
    }

    // Setup all API routes
    smartSystem.setupExpressRoutes(app);

    // Attach to app for middleware use
    app.use((req, res, next) => {
      req.smartSystem = smartSystem;
      req.intelligence = smartSystem.intelligence;
      req.automation = smartSystem.automation;
      req.analytics = smartSystem.analytics;
      req.ui = smartSystem.ui;
      next();
    });

    console.log('✅ Intelligent System Ready\n');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Intelligent System:', error);
    return false;
  }
}

// ============================================================================
// Step 3: Update your main server initialization
// ============================================================================

// EXAMPLE USAGE IN YOUR SERVER.JS:

/*
const express = require('express');
const app = express();

// ... your existing middleware setup ...

// Initialize Intelligent System
(async () => {
  const systemReady = await initializeIntelligentSystem(app);
  
  if (!systemReady) {
    console.error('Failed to initialize intelligent system');
    process.exit(1);
  }

  // Now start your server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Smart Dashboard: http://localhost:${PORT}/api/smart/dashboard`);
    console.log(`Smart Status: http://localhost:${PORT}/api/smart/status`);
  });
})();
*/

// ============================================================================
// Step 4: Example middleware using Intelligent System
// ============================================================================

/**
 * Middleware to track requests with Intelligence Engine
 */
function setupIntelligentRequestTracking(app) {
  app.use(async (req, res, next) => {
    const startTime = Date.now();

    // Track request in analytics
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      
      await req.analytics.trackMetric('response_time', duration, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      });

      // Check for anomalies
      if (duration > 1000) {
        const anomalies = await req.intelligence.detectAnomalies([{ duration, path: req.path }]);
        if (anomalies.anomaliesDetected > 0) {
          console.warn(`⚠️  Slow request detected: ${req.path} (${duration}ms)`);
        }
      }
    });

    next();
  });
}

// ============================================================================
// Step 5: Example routes using Intelligent System
// ============================================================================

/**
 * Example: Smart recommendations endpoint
 */
function setupSmartRecommendations(app) {
  app.get('/api/smart/page-recommendations/:pageName', async (req, res) => {
    try {
      const { pageName } = req.params;
      const userId = req.user?.id || 'guest';

      // Get UI recommendations
      const uiRecs = await req.ui.getUIRecommendations(userId, {
        lastModule: pageName,
        userRole: req.user?.role,
      });

      // Get intelligent recommendations
      const smartRecs = await req.intelligence.getSmartRecommendations({
        context: pageName,
        userRole: req.user?.role,
      });

      res.json({
        success: true,
        data: {
          ui: uiRecs,
          intelligence: smartRecs,
          personalization: await req.ui.getUserPersonalization(userId),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

/**
 * Example: Smart workflow execution endpoint
 */
function setupSmartWorkflowExecution(app) {
  app.post('/api/smart/execute-workflow/:workflowName', async (req, res) => {
    try {
      const { workflowName } = req.params;
      const workflows = await req.automation.getWorkflows();
      
      const workflow = workflows.find(w => w.name === workflowName);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      const result = await req.automation.executeWorkflow(workflow.id, req.body);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

/**
 * Example: Custom analytics report endpoint
 */
function setupCustomAnalytics(app) {
  app.post('/api/smart/custom-report', async (req, res) => {
    try {
      const { metrics, timeframe, format } = req.body;
      
      // Generate custom report
      const data = await req.analytics.getAggregatedMetrics(
        metrics[0], 
        timeframe || '24h'
      );

      // Format report
      const report = {
        timestamp: new Date(),
        metrics: data,
        format: format || 'json',
      };

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ============================================================================
// Step 6: Setup intelligent error handling
// ============================================================================

function setupIntelligentErrorHandling(app, smartSystem) {
  app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Track error in analytics
    req.analytics.trackMetric('errors', 1, {
      type: err.name,
      path: req.path,
      message: err.message,
    });

    // Check if this is an anomaly
    smartSystem.intelligence.detectAnomalies([{
      type: 'error',
      severity: err.statusCode >= 500 ? 'high' : 'medium',
      message: err.message,
    }]).catch(console.error);

    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  });
}

// ============================================================================
// Step 7: Setup automated system monitoring
// ============================================================================

async function setupSystemMonitoring(smartSystem) {
  console.log('🔍 Setting up system monitoring...\n');

  // Monitor system every 5 minutes
  setInterval(async () => {
    try {
      const status = await smartSystem.getSystemStatus();
      
      // Track system health metrics
      await smartSystem.analytics.trackMetric('system_health', status.health.cpuUsage, {
        metric: 'cpu',
      });
      
      await smartSystem.analytics.trackMetric('system_health', status.health.memoryUsage, {
        metric: 'memory',
      });

      // Check for anomalies
      if (status.health.cpuUsage > 85) {
        console.warn('⚠️  High CPU usage detected:', status.health.cpuUsage + '%');
      }

      if (status.health.memoryUsage > 90) {
        console.warn('⚠️  High memory usage detected:', status.health.memoryUsage + '%');
      }
    } catch (error) {
      console.error('Error monitoring system:', error);
    }
  }, 300000); // Every 5 minutes

  console.log('✅ System monitoring enabled\n');
}

// ============================================================================
// Step 8: Complete Integration Example
// ============================================================================

/*
// IN YOUR server.js:

const express = require('express');
const app = express();

// Your existing middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Initialize Intelligent System
(async () => {
  const smartSystem = getSmartSystem();
  const initialized = await smartSystem.initialize();

  if (!initialized) {
    console.error('Failed to initialize intelligent system');
    process.exit(1);
  }

  // Setup routes and middleware
  smartSystem.setupExpressRoutes(app);
  setupIntelligentRequestTracking(app);
  setupSmartRecommendations(app);
  setupSmartWorkflowExecution(app);
  setupCustomAnalytics(app);
  setupIntelligentErrorHandling(app, smartSystem);
  setupSystemMonitoring(smartSystem);

  // Add to app
  app.use((req, res, next) => {
    req.smartSystem = smartSystem;
    next();
  });

  // Your other routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  // ... more routes ...

  // Start server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\\n✅ Server ready on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/smart/dashboard`);
    console.log(`🔍 Status: http://localhost:${PORT}/api/smart/status\\n`);
  });
})();
*/

// ============================================================================
// Step 9: Testing the Integration
// ============================================================================

async function testIntelligentSystem(smartSystem) {
  console.log('\n🧪 Testing Intelligent System Integration...\n');

  try {
    // Test 1: Get system status
    const status = await smartSystem.getSystemStatus();
    console.log('✅ System Status:', status.status);

    // Test 2: Get dashboard
    const dashboard = await smartSystem.getDashboard('test-user', '24h');
    console.log('✅ Dashboard loaded');

    // Test 3: Generate report
    const report = await smartSystem.analytics.generateReport('performance', '24h');
    console.log('✅ Performance report generated');

    // Test 4: Get insights
    const insights = await smartSystem.getAIPoweredInsights();
    console.log('✅ AI insights generated');

    // Test 5: Predict trends
    const prediction = await smartSystem.intelligence.predictTrends([1, 2, 3, 4, 5], 'test');
    console.log('✅ Trends predicted');

    console.log('\n✅ All tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Step 10: Export Integration Functions
// ============================================================================

module.exports = {
  initializeIntelligentSystem,
  setupIntelligentRequestTracking,
  setupSmartRecommendations,
  setupSmartWorkflowExecution,
  setupCustomAnalytics,
  setupIntelligentErrorHandling,
  setupSystemMonitoring,
  testIntelligentSystem,
};

// ============================================================================
// QUICK START CHECKLIST
// ============================================================================

const INTEGRATION_CHECKLIST = {
  '✅ Copy library files': 'backend/lib/*.js',
  '✅ Add imports': 'In server.js',
  '✅ Initialize system': 'await initializeIntelligentSystem(app)',
  '✅ Setup routes': 'smartSystem.setupExpressRoutes(app)',
  '✅ Add middleware': 'Express middleware setup',
  '✅ Setup monitoring': 'System monitoring enabled',
  '✅ Test endpoints': 'Verify /api/smart/* endpoints',
  '✅ Production ready': 'Deploy to production',
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🎯 INTELLIGENT SYSTEM INTEGRATION GUIDE 🎯                ║
║                                                                ║
║               Integration Steps:                               ║
║               1. Copy library files                            ║
║               2. Add imports to server.js                      ║
║               3. Initialize smart system                       ║
║               4. Setup Express routes                          ║
║               5. Add middleware                                ║
║               6. Start system monitoring                       ║
║               7. Test all endpoints                            ║
║               8. Deploy to production                          ║
║                                                                ║
║         Status: ✅ READY FOR INTEGRATION                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
