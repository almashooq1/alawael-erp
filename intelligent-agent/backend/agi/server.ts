// server.ts - AGI Integration
// تكامل نظام AGI مع Express Backend

import express from 'express';
import cors from 'cors';
import path from 'path';
import agiRoutes from './agi.routes';
import rehabAGIRoutes from './rehab-agi.routes';
import { monitoring, monitoringMiddleware } from './monitoring';

const app = express();
const PORT = process.env.AGI_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Monitoring middleware (track all requests)
app.use(monitoringMiddleware);

// Serve static files (dashboard)
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/agi', agiRoutes);
app.use('/api/rehab-agi', rehabAGIRoutes);  // نظام مراكز التأهيل

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AGI System',
    version: '1.0.0',
    timestamp: new Date(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🧠 AGI System - Artificial General Intelligence',
    version: '1.0.0',
    components: [
      'Reasoning Engine',
      'Continual Learning',
      'Autonomous Decision',
      'Creativity & Innovation',
      'Long-term Planning',
      'Context Understanding',
      '🏥 Disability Rehabilitation AGI',
    ],
    endpoints: {
      // General AGI
      process: 'POST /api/agi/process',
      reason: 'POST /api/agi/reason',
      learn: 'POST /api/agi/learn',
      decide: 'POST /api/agi/decide',
      create: 'POST /api/agi/create',
      plan: 'POST /api/agi/plan',
      status: 'GET /api/agi/status',
      health: 'GET /api/agi/health',
      metrics: 'GET /api/agi/metrics',
      report: 'GET /api/agi/report',
      capabilities: 'GET /api/agi/capabilities',
      examples: 'GET /api/agi/examples',
      dashboard: 'GET /dashboard',

      // Rehabilitation AGI
      rehabAnalyze: 'POST /api/rehab-agi/beneficiary/analyze',
      rehabSuggestProgram: 'POST /api/rehab-agi/beneficiary/suggest-program',
      rehabPredictProgress: 'POST /api/rehab-agi/beneficiary/predict-progress',
      rehabERPSync: 'POST /api/rehab-agi/erp/sync-beneficiary',
      rehabCapabilities: 'GET /api/rehab-agi/capabilities',
      rehabExamples: 'GET /api/rehab-agi/examples',
    },
    documentation: 'See README_AGI.md for details',
    monitoring: {
      dashboard: `http://localhost:${PORT}/dashboard/dashboard.html`,
      prometheus: `http://localhost:${PORT}/api/agi/metrics`,
      report: `http://localhost:${PORT}/api/agi/report`,
    },
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date(),
  });
});

// Start server
app.listen(PORT, () => {
  // Start monitoring
  monitoring.startMonitoring(60000); // Check health every 60 seconds

  console.log('');
  console.log('🧠 ═══════════════════════════════════════════════════════');
  console.log('🚀 AGI System Started Successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Monitoring Dashboard: http://localhost:${PORT}/dashboard/dashboard.html`);
  console.log(`📈 Prometheus Metrics: http://localhost:${PORT}/api/agi/metrics`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/agi/examples`);
  console.log('');
  console.log('🎯 Available Components:');
  console.log('   ✅ Reasoning Engine (7 types)');
  console.log('   ✅ Continual Learning (8 modes)');
  console.log('   ✅ Autonomous Decision (6 types)');
  console.log('   ✅ Creativity & Innovation (6 types)');
  console.log('   ✅ Long-term Planning (5 algorithms)');
  console.log('   ✅ Context Understanding (deep semantic)');
  console.log('   🏥 Disability Rehabilitation AGI (8 disability types, 8 rehab programs)');
  console.log('   💼 ERP Integration (8 modules: HR, Finance, Medical, etc.)');
  console.log('');
  console.log('🏥 Rehabilitation AGI Endpoints:');
  console.log(`   📊 Beneficiary Analysis: POST http://localhost:${PORT}/api/rehab-agi/beneficiary/analyze`);
  console.log(`   💊 Program Suggestions: POST http://localhost:${PORT}/api/rehab-agi/beneficiary/suggest-program`);
  console.log(`   📈 Progress Prediction: POST http://localhost:${PORT}/api/rehab-agi/beneficiary/predict-progress`);
  console.log(`   💼 ERP Synchronization: POST http://localhost:${PORT}/api/rehab-agi/erp/sync-beneficiary`);
  console.log(`   📚 Capabilities: GET http://localhost:${PORT}/api/rehab-agi/capabilities`);
  console.log(`   📖 Examples: GET http://localhost:${PORT}/api/rehab-agi/examples`);
  console.log('');
  console.log('🔄 Cognitive Cycle: Active');
  console.log('📊 Monitoring System: Active');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

export default app;
