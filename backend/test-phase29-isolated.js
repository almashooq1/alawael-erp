#!/usr/bin/env node
/**
 * Isolated Test Server - Phase 29-33 ONLY
 * Minimal Express server to verify Phase 29-33 routes work independently
 */

const express = require('express');
const app = express();
const PORT = 3099;

// Minimal middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Isolated Test Server' });
});

// Mount Phase 29-33 routes
console.log('🔧 Loading Phase 29-33 routes...');
try {
  const phases2933Routes = require('./routes/phases-29-33.routes');
  console.log(
    `✅ Routes loaded: ${phases2933Routes.stack ? phases2933Routes.stack.length : 'unknown'} layers`
  );

  // Add debug middleware
  app.use('/api/phases-29-33', (req, res, next) => {
    console.log(`[MATCHED] ${req.method} ${req.path}`);
    next();
  });

  // Mount the routes
  app.use('/api/phases-29-33', phases2933Routes);
  console.log('✅ Phase 29-33 routes mounted at /api/phases-29-33');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  process.exit(1);
}

// 404 handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Isolated Test Server running on http://localhost:${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/phases-29-33/ai/llm/providers\n`);
});
