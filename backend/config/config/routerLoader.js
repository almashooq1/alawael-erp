/**
 * Router Loader Configuration
 * This file ensures all routers are loaded correctly with proper fallbacks
 */

// Safe router loading with fallback
const loadRouter = (routerPath, routerName) => {
  try {
    const router = require(routerPath);
    console.log(`✅ Loaded: ${routerName}`);
    return router;
  } catch (_error) {
    console.log(`⚠️  Router ${routerName} not found at ${routerPath}`);
    // Return a minimal express router as fallback
    const express = require('express');
    const fallbackRouter = express.Router();
    
    fallbackRouter.use((req, res) => {
      res.status(503).json({
        error: `Module ${routerName} not configured`,
        message: 'This feature is not currently available'
      });
    });
    
    return fallbackRouter;
  }
};

// Mapping of router names to actual file paths
const ROUTER_MAPPING = {
  performanceEvaluations: './routes/performanceEvaluations',
  performanceEvaluation: './routes/performanceEvaluation',
  aiNotifications: './routes/aiNotifications',
  approvalRequests: './routes/approvalRequests',
  montessoriAuth: './routes/montessoriAuth',
  montessori: './routes/montessori',
  notificationTemplates: './routes/notificationTemplates',
  fcm: './routes/fcm',
  templates: './routes/templates',
  orgBranding: './routes/orgBranding',
  ai: './routes/ai',
  sso: './routes/sso.routes',
  supplyChain: './routes/supplyChain.routes',
  branchIntegration: './routes/branch-integration.routes',
  notificationRoutes: './routes/notificationRoutes',
  
  // Additional routers from app.js
  vehicles: './routes/vehicles',
  transportRoutes: './routes/transportRoutes',
  trips: './routes/trips',
  drivers: './routes/drivers',
  gps: './routes/gps',
  trafficAccidents: './routes/trafficAccidents',
  trafficAccidentAnalytics: './routes/trafficAccidentAnalytics',
  moiPassport: './routes/moi-passport.routes',
  upload: './routes/upload',
  export: './routes/export',
  realtimeCollaboration: './routes/realtimeCollaboration.routes',
  smartNotifications: './routes/smartNotifications',
  advancedAnalytics: './routes/advancedAnalytics.routes',
  mobileApp: './routes/mobileApp.routes',
  dashboardWidget: './routes/dashboardWidget.routes',
  tenant: './routes/tenant.routes',
  aiRecommendations: './routes/ai.recommendations.routes',
  integrationHub: './routes/integrationHub.routes',
  qiwa: './routes/qiwa.routes',
  measurements: './routes/measurements.routes'
};

// Export function to load all routers
const loadAllRouters = () => {
  const routers = {};
  
  for (const [name, path] of Object.entries(ROUTER_MAPPING)) {
    routers[name] = loadRouter(path, name);
  }
  
  return routers;
};

module.exports = {
  loadRouter,
  loadAllRouters,
  ROUTER_MAPPING
};
